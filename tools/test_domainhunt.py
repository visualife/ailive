"""Offline tests: fake DNS (UDP) and RDAP (HTTP) servers on localhost."""
import contextlib
import csv
import io
import json
import socketserver
import string
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import domainhunt as dh

TAKEN = set(string.ascii_lowercase) - {"a", "b", "c"} | {"google", "microsoft"}
DNS_FREE = {"a", "b", "c"}  # NXDOMAIN in DNS; "c" is held, so RDAP still says taken
RDAP_TAKEN = TAKEN | {"c"}


def label_of(qname_bytes):
    return qname_bytes[1:1 + qname_bytes[0]].decode()


class FakeDns(socketserver.ThreadingUDPServer):
    allow_reuse_address = True

    class Handler(socketserver.BaseRequestHandler):
        def handle(self):
            data, sock = self.request
            label = label_of(data[12:])
            if label in DNS_FREE or label not in TAKEN:
                flags, an = 0x8183, 0
            else:
                flags, an = 0x8180, 1
            reply = data[:2] + flags.to_bytes(2, "big") + data[4:6] + an.to_bytes(2, "big") + data[8:12]
            reply += data[12:]  # echo question
            if an:
                reply += b"\xc0\x0c\x00\x02\x00\x01\x00\x00\x00\x3c\x00\x02\xc0\x0c"
            sock.sendto(reply, self.client_address)

    def __init__(self):
        super().__init__(("127.0.0.1", 0), self.Handler)


def close(server):
    server.shutdown()
    server.server_close()


def start(server):
    threading.Thread(target=server.serve_forever, args=(0.01,), daemon=True).start()
    return server


def rdap_server(rule):
    """rule(label, hit_count) -> (code, body, headers)"""
    hits = {}
    lock = threading.Lock()

    class H(BaseHTTPRequestHandler):
        def do_GET(self):
            label = self.path.rsplit("/", 1)[1].split(".")[0]
            with lock:
                hits[label] = hits.get(label, 0) + 1
                n = hits[label]
            code, body, headers = rule(label, n)
            self.send_response(code)
            for k, v in headers.items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(body.encode())

        def log_message(self, *a):
            pass

    srv = start(ThreadingHTTPServer(("127.0.0.1", 0), H))
    srv.base = f"http://127.0.0.1:{srv.server_address[1]}/"
    return srv


DOMAIN = json.dumps({"objectClassName": "domain", "ldhName": "x"})
NOT_FOUND = json.dumps({"errorCode": 404})


def registry(label, n):
    return (404, NOT_FOUND, {}) if label not in RDAP_TAKEN else (200, DOMAIN, {})


class Patterns(unittest.TestCase):
    def test_sizes_and_labels(self):
        self.assertEqual(dh.pattern_size("cvc"), 21 * 5 * 21)
        labels = list(dh.pattern_labels("vd", "x", "y"))
        self.assertEqual(len(labels), 50)
        self.assertEqual(labels[:2], ["xa0y", "xa1y"])


class DnsStage(unittest.TestCase):
    def setUp(self):
        self.srv = start(FakeDns())
        self.addCleanup(close, self.srv)
        self.dns = dh.Dns([f"127.0.0.1:{self.srv.server_address[1]}"], timeout=1, attempts=1)

    def test_states(self):
        self.assertEqual(self.dns.ns("google.com"), "delegated")
        self.assertEqual(self.dns.ns("a.com"), "nxdomain")

    def test_timeout_is_unclear(self):
        dead = dh.Dns(["127.0.0.1:9"], timeout=0.2, attempts=2)
        self.assertEqual(dead.ns("google.com"), "unclear")


class RdapStage(unittest.TestCase):
    def lookup(self, rule, domain, **kw):
        srv = rdap_server(rule)
        self.addCleanup(close, srv)
        r = dh.Rdap(rate=1000, backoff=0.01, overrides={"com": srv.base}, **kw)
        return r.lookup(domain)

    def test_taken_and_available(self):
        self.assertEqual(self.lookup(registry, "google.com"), ("taken", ""))
        self.assertEqual(self.lookup(registry, "a.com"), ("available", ""))

    def test_429_then_success(self):
        def rule(label, n):
            return (429, "", {"Retry-After": "0"}) if n == 1 else (200, DOMAIN, {})
        self.assertEqual(self.lookup(rule, "slow.com"), ("taken", ""))

    def test_persistent_500_is_unknown(self):
        status, why = self.lookup(lambda l, n: (500, "", {}), "boom.com", retries=2)
        self.assertEqual((status, why), ("unknown", "HTTP 500"))

    def test_non_rdap_200_is_not_taken(self):
        status, _ = self.lookup(lambda l, n: (200, "<html>portal</html>", {}), "x.com")
        self.assertEqual(status, "unknown")

    def test_unknown_tld(self):
        r = dh.Rdap(overrides={"com": "http://x/"}, cache_dir=None)
        r._bootstrap = {}
        self.assertEqual(r.lookup("a.zz")[0], "unknown")


class SelfTest(unittest.TestCase):
    def test_blanket_404_is_caught(self):
        dns_srv = start(FakeDns())
        rdap_srv = rdap_server(lambda l, n: (404, NOT_FOUND, {}))
        self.addCleanup(close, dns_srv)
        self.addCleanup(close, rdap_srv)
        dns = dh.Dns([f"127.0.0.1:{dns_srv.server_address[1]}"], timeout=1, attempts=1)
        rdap = dh.Rdap(rate=1000, overrides={"com": rdap_srv.base})
        problems = dh.self_test({"com"}, dns, rdap)
        self.assertEqual(len(problems), 1)
        self.assertIn("registered canary", problems[0])


class EndToEnd(unittest.TestCase):
    def run_main(self, rule, *extra):
        dns_srv = start(FakeDns())
        rdap_srv = rdap_server(rule)
        self.addCleanup(close, dns_srv)
        self.addCleanup(close, rdap_srv)
        argv = ["--dns-server", f"127.0.0.1:{dns_srv.server_address[1]}",
                "--rdap-base", f"com={rdap_srv.base}", "--rdap-rate", "1000",
                "--no-cache", "--tld", "com", *extra]
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = dh.main(argv)
        return code, sorted(out.getvalue().split()), err.getvalue()

    def test_available_requires_rdap_confirmation(self):
        code, out, _ = self.run_main(registry, "-p", "l")
        self.assertEqual((code, out), (0, ["a.com", "b.com"]))  # c.com: DNS-free but RDAP-held

    def test_dns_only_reports_likely(self):
        code, out, err = self.run_main(registry, "-p", "l", "--dns-only")
        self.assertEqual(out, ["a.com", "b.com", "c.com"])
        self.assertIn("likely", err)

    def test_limit(self):
        _, out, _ = self.run_main(registry, "-p", "l", "-n", "1")
        self.assertEqual(len(out), 1)

    def test_csv_has_every_result(self):
        with tempfile.NamedTemporaryFile("w+", suffix=".csv") as f:
            self.run_main(registry, "-p", "l", "-o", f.name)
            with open(f.name) as fh:
                rows = list(csv.DictReader(fh))
        by = {r["domain"]: r for r in rows}
        self.assertEqual(len(rows), 26)
        self.assertEqual(by["c.com"]["status"], "taken")
        self.assertEqual((by["c.com"]["via"], by["z.com"]["via"]), ("rdap", "dns"))

    def test_broken_rdap_aborts_with_no_output(self):
        code, out, err = self.run_main(lambda l, n: (404, NOT_FOUND, {}), "-p", "l")
        self.assertEqual((code, out), (2, []))
        self.assertIn("self-test failed", err)


if __name__ == "__main__":
    unittest.main()
