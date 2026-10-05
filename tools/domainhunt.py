#!/usr/bin/env python3
"""Find unregistered short domains (.com and .ai by default). Stdlib only.

Each candidate goes through two stages:
  1. DNS NS lookup over UDP. A delegated domain is taken, which settles most names.
  2. RDAP at the registry. 404 means unregistered, 200 means taken.

A name is reported as available only when RDAP says so. Anything inconclusive is
"unknown", never "available". Taken results are cached, so re-runs are fast.

Unregistered is not the same as registrable: registries reserve or price-gate some
short names (notably 1-2 character .ai), so confirm hits at a registrar.

  domainhunt.py -l 3                       every 3-letter name, .com and .ai
  domainhunt.py -p cvcv --tld ai -n 20     20 pronounceable 4-letter .ai names
  domainhunt.py -w words.txt --max-len 6   names from a word list ('-' = stdin)
  domainhunt.py zap flux nova.ai           specific names

Pattern classes: l letter, d digit, v vowel, c consonant, x letter or digit.
Available names go to stdout, progress and summary to stderr.
"""
from __future__ import annotations

import argparse
import csv
import itertools
import json
import math
import os
import random
import re
import socket
import sqlite3
import string
import struct
import sys
import threading
import time
import urllib.error
import urllib.request
from collections import Counter
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from dataclasses import dataclass
from pathlib import Path

UA = "domainhunt/1.0"
BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json"
FALLBACK_RDAP = {
    "com": "https://rdap.verisign.com/com/v1/",
    "ai": "https://rdap.identitydigital.services/rdap/",
}
DNS_SERVERS = ["1.1.1.1", "8.8.8.8", "9.9.9.9"]
CANARIES = ("google", "microsoft", "amazon", "apple", "openai")
CLASSES = {
    "l": string.ascii_lowercase,
    "d": string.digits,
    "v": "aeiou",
    "c": "bcdfghjklmnpqrstvwxyz",
    "x": string.ascii_lowercase + string.digits,
}
LABEL_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")
STATUSES = ("available", "likely", "taken", "unknown")
HITS = ("available", "likely")


@dataclass(frozen=True)
class Result:
    domain: str
    status: str  # available | likely | taken | unknown | pending (needs RDAP)
    via: str = ""
    detail: str = ""


class Dns:
    def __init__(self, servers, timeout=2.0, attempts=3):
        self.servers = [self._addr(s) for s in servers]
        self.timeout, self.attempts = timeout, attempts
        self._rr = itertools.count()

    @staticmethod
    def _addr(server):
        host, _, port = server.partition(":")
        return host, int(port or 53)

    def ns(self, domain):
        """'delegated', 'nxdomain' or 'unclear'."""
        txid = os.urandom(2)
        qname = b"".join(bytes([len(p)]) + p.encode() for p in domain.split("."))
        query = txid + struct.pack(">HHHHH", 0x0100, 1, 0, 0, 0) + qname + b"\0" + struct.pack(">HH", 2, 1)
        for _ in range(self.attempts):
            host, port = self.servers[next(self._rr) % len(self.servers)]
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
                sock.settimeout(self.timeout)
                try:
                    sock.sendto(query, (host, port))
                    data, addr = sock.recvfrom(1232)
                except OSError:
                    continue
            if addr[0] != host or len(data) < 12 or data[:2] != txid:
                continue
            flags, _, ancount = struct.unpack(">HHH", data[2:8])
            if not flags & 0x8000 or flags & 0x0200:
                continue
            rcode = flags & 0xF
            if rcode == 3:
                return "nxdomain"
            if rcode == 0 and ancount:
                return "delegated"
            return "unclear"
        return "unclear"


class RateLimiter:
    def __init__(self, per_sec, stop):
        self._interval = 1.0 / per_sec
        self._next = 0.0
        self._lock = threading.Lock()
        self._stop = stop

    def wait(self):
        with self._lock:
            now = time.monotonic()
            at = max(now, self._next)
            self._next = at + self._interval
        self._stop.wait(at - now)

    def penalize(self, seconds):
        with self._lock:
            self._next = max(self._next, time.monotonic() + seconds)


class Rdap:
    def __init__(self, rate=5.0, timeout=10.0, retries=4, backoff=1.0,
                 cache_dir=None, overrides=None, stop=None):
        self.rate, self.timeout, self.retries, self.backoff = rate, timeout, retries, backoff
        self.cache_dir = cache_dir
        self.overrides = overrides or {}
        self.stop = stop or threading.Event()
        self._bootstrap = None
        self._lock = threading.Lock()
        self._limiters = {}

    def _open(self, url):
        req = urllib.request.Request(url, headers={"Accept": "application/rdap+json", "User-Agent": UA})
        return urllib.request.urlopen(req, timeout=self.timeout)

    def _bases(self):
        with self._lock:
            if self._bootstrap is None:
                self._bootstrap = self._load_bootstrap()
            return self._bootstrap

    def _load_bootstrap(self):
        cache = self.cache_dir / "rdap-bootstrap.json" if self.cache_dir else None
        data = None
        try:
            if cache and cache.exists() and time.time() - cache.stat().st_mtime < 7 * 86400:
                data = json.loads(cache.read_text())
            else:
                with self._open(BOOTSTRAP_URL) as resp:
                    data = json.load(resp)
                if cache:
                    cache.parent.mkdir(parents=True, exist_ok=True)
                    cache.write_text(json.dumps(data))
        except (OSError, ValueError):
            pass
        bases = dict(FALLBACK_RDAP)
        try:
            for tlds, urls in data["services"]:
                url = next((u for u in urls if u.startswith("https://")), None)
                if url:
                    bases.update({t.lower(): url.rstrip("/") + "/" for t in tlds})
        except (KeyError, TypeError, ValueError):
            pass
        return bases

    def _limiter(self, base):
        with self._lock:
            if base not in self._limiters:
                self._limiters[base] = RateLimiter(self.rate, self.stop)
            return self._limiters[base]

    @staticmethod
    def _retry_after(err):
        try:
            return min(float(err.headers.get("Retry-After", "")), 60.0)
        except ValueError:
            return None

    def lookup(self, domain, retries=None):
        """Returns (status, detail); status is available, taken or unknown."""
        tld = domain.rpartition(".")[2]
        base = self.overrides.get(tld) or self._bases().get(tld)
        if not base:
            return "unknown", f"no RDAP server for .{tld}"
        url = f"{base}domain/{domain}"
        limiter = self._limiter(base)
        delay, why = self.backoff, "no attempt"
        for _ in range((self.retries if retries is None else retries) + 1):
            if self.stop.is_set():
                return "unknown", "interrupted"
            limiter.wait()
            try:
                with self._open(url) as resp:
                    body = json.load(resp)
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    return "available", ""
                if e.code != 429 and e.code < 500:
                    return "unknown", f"HTTP {e.code}"
                why = f"HTTP {e.code}"
                limiter.penalize(self._retry_after(e) or delay)
            except (urllib.error.URLError, OSError) as e:
                why = str(getattr(e, "reason", e))
                limiter.penalize(delay)
            except ValueError:
                return "unknown", "unexpected response"
            else:
                if isinstance(body, dict) and ("ldhName" in body or body.get("objectClassName") == "domain"):
                    return "taken", ""
                return "unknown", "unexpected response"
            delay = min(delay * 2, 30.0)
        return "unknown", why


class TakenCache:
    """Remembers registered domains between runs. Only the main thread writes."""

    def __init__(self, directory, max_age_days):
        self.known, self._new, self._db = frozenset(), [], None
        if directory is None:
            return
        try:
            directory.mkdir(parents=True, exist_ok=True)
            self._db = sqlite3.connect(directory / "taken.sqlite")
            self._db.execute("CREATE TABLE IF NOT EXISTS taken (domain TEXT PRIMARY KEY, checked REAL)")
            cutoff = time.time() - max_age_days * 86400
            rows = self._db.execute("SELECT domain FROM taken WHERE checked >= ?", (cutoff,))
            self.known = {r[0] for r in rows}
        except (OSError, sqlite3.Error) as e:
            print(f"cache disabled: {e}", file=sys.stderr)
            self._db = None

    def add(self, domain):
        if self._db is None:
            return
        self._new.append((domain, time.time()))
        if len(self._new) >= 1000:
            self.flush()

    def flush(self):
        if self._db is not None and self._new:
            self._db.executemany("INSERT OR REPLACE INTO taken VALUES (?, ?)", self._new)
            self._db.commit()
            self._new.clear()

    def close(self):
        self.flush()
        if self._db is not None:
            self._db.close()


class Checker:
    def __init__(self, dns, rdap, known=frozenset(), dns_only=False):
        self.dns, self.rdap, self.known, self.dns_only = dns, rdap, known, dns_only

    def stage1(self, domain):
        try:
            if domain in self.known:
                return Result(domain, "taken", "cache")
            state = self.dns.ns(domain)
            if state == "delegated":
                return Result(domain, "taken", "dns")
            if self.dns_only:
                if state == "nxdomain":
                    return Result(domain, "likely", "dns")
                return Result(domain, "unknown", "dns", "inconclusive")
            return Result(domain, "pending")
        except Exception as e:
            return Result(domain, "unknown", "dns", repr(e))

    def stage2(self, domain):
        try:
            status, detail = self.rdap.lookup(domain)
            return Result(domain, status, "rdap", detail)
        except Exception as e:
            return Result(domain, "unknown", "rdap", repr(e))


class Reporter:
    def __init__(self, total, verbose=False, out=None):
        self.total, self.verbose, self._out = total, verbose, out
        self.tty = sys.stderr.isatty()
        self._last_tick = 0.0
        self._csv = csv.writer(out) if out else None
        if self._csv:
            self._csv.writerow(["domain", "status", "via", "detail"])

    def _clear(self):
        if self.tty:
            sys.stderr.write("\r\033[K")

    def result(self, res):
        if self._csv:
            self._csv.writerow([res.domain, res.status, res.via, res.detail])
        if res.status in HITS:
            self._clear()
            print(res.domain, flush=True)
            if self._out:
                self._out.flush()
        elif self.verbose:
            self._clear()
            print(f"{res.status:9} {res.domain} {res.via} {res.detail}".rstrip(), file=sys.stderr)

    def tick(self, counts):
        now = time.monotonic()
        if self.tty and now - self._last_tick > 0.2:
            self._last_tick = now
            done = sum(counts[s] for s in STATUSES)
            hits = sum(counts[s] for s in HITS)
            sys.stderr.write(f"\r{done:,}/{self.total:,}  found {hits}  unknown {counts['unknown']}\033[K")
            sys.stderr.flush()

    def finish(self):
        self._clear()
        if self._out:
            self._out.flush()


def hunt(domains, checker, *, workers, rdap_workers, limit, stop, on_result, on_tick):
    """Two-stage pipeline: DNS workers feed a small RDAP pool. Returns (counts, interrupted)."""
    counts = Counter()
    dns_pool = ThreadPoolExecutor(workers)
    rdap_pool = ThreadPoolExecutor(rdap_workers)
    pending, window, it = set(), workers * 4, iter(domains)
    interrupted = False
    try:
        reached = False
        while not reached:
            while len(pending) < window and (d := next(it, None)) is not None:
                pending.add(dns_pool.submit(checker.stage1, d))
            if not pending:
                break
            done, pending = wait(pending, return_when=FIRST_COMPLETED)
            for fut in done:
                res = fut.result()
                if res.status == "pending":
                    pending.add(rdap_pool.submit(checker.stage2, res.domain))
                    continue
                counts[res.status] += 1
                on_result(res)
                if limit and sum(counts[s] for s in HITS) >= limit:
                    reached = True
                    break
            on_tick(counts)
    except KeyboardInterrupt:
        interrupted = True
    finally:
        stop.set()
        dns_pool.shutdown(wait=False, cancel_futures=True)
        rdap_pool.shutdown(wait=False, cancel_futures=True)
    return counts, interrupted


def pattern_size(pattern):
    return math.prod(len(CLASSES[c]) for c in pattern)


def pattern_labels(pattern, prefix="", suffix=""):
    for combo in itertools.product(*(CLASSES[c] for c in pattern)):
        yield prefix + "".join(combo) + suffix


def read_words(path, min_len, max_len):
    f = sys.stdin if path == "-" else open(path, encoding="utf-8")
    with f:
        for line in f:
            w = line.strip().lower()
            if min_len <= len(w) <= max_len and LABEL_RE.match(w):
                yield w


def self_test(tlds, dns, rdap):
    """Canary lookups per TLD. Catches a wrong or intercepted RDAP endpoint before it
    can report every name as available."""
    problems = []
    for tld in sorted(tlds):
        free = "".join(random.choices(string.ascii_lowercase, k=24)) + "." + tld
        status, why = rdap.lookup(free, retries=1)
        if status != "available":
            problems.append(f".{tld}: unregistered canary {free} gave {status} {why}".rstrip())
        taken = next((d for d in (f"{n}.{tld}" for n in CANARIES) if dns.ns(d) == "delegated"), None)
        if taken is None:
            print(f"warning: no known-registered canary found for .{tld}, skipping that check", file=sys.stderr)
            continue
        status, why = rdap.lookup(taken, retries=1)
        if status != "taken":
            problems.append(f".{tld}: registered canary {taken} gave {status} {why}".rstrip())
    return problems


def default_cache_dir():
    return Path(os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache") / "domainhunt"


def build_domains(args, parser):
    tlds = [t.strip().lower().lstrip(".") for t in args.tld.split(",") if t.strip()]
    if not tlds:
        parser.error("--tld needs at least one TLD")
    pattern = "l" * args.length if args.length else args.pattern
    explicit, plain = [], []
    for name in args.names:
        name = name.strip().lower()
        label, dot, tld = name.rpartition(".")
        if not dot:
            label, tld = name, None
        if not LABEL_RE.match(label) or (tld is not None and not re.fullmatch(r"[a-z]{2,63}", tld)):
            parser.error(f"invalid name: {name}")
        (explicit.append(name) if tld else plain.append(label))
    words = []
    if args.words:
        found = dict.fromkeys(read_words(args.words, args.min_len, args.max_len))
        words = [args.prefix + w + args.suffix for w in found]
    labels = list(dict.fromkeys(plain + words))
    if not (explicit or labels or pattern):
        parser.error("give names, --words, --length or --pattern")

    total = len(explicit) + len(labels) * len(tlds)
    used = {n.rpartition(".")[2] for n in explicit}
    if labels or pattern:
        used |= set(tlds)
    if pattern:
        total += pattern_size(pattern) * len(tlds)

    def gen():
        yield from explicit
        for label in labels:
            for tld in tlds:
                yield f"{label}.{tld}"
        if pattern:
            for label in pattern_labels(pattern, args.prefix, args.suffix):
                for tld in tlds:
                    yield f"{label}.{tld}"

    return gen(), total, used


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Find unregistered short domains.",
                                epilog="Pattern classes: l letter, d digit, v vowel, c consonant, x letter/digit.")
    p.add_argument("names", nargs="*", help="names to check; 'nova.ai' pins the TLD")
    src = p.add_mutually_exclusive_group()
    src.add_argument("-l", "--length", type=int, metavar="N", help="all N-letter names (same as -p l*N)")
    src.add_argument("-p", "--pattern", metavar="CLASSES", help="e.g. cvc, cvcv, lld")
    p.add_argument("-w", "--words", metavar="FILE", help="one name per line, '-' for stdin")
    p.add_argument("--min-len", type=int, default=1, help="shortest word to use (default 1)")
    p.add_argument("--max-len", type=int, default=63, help="longest word to use")
    p.add_argument("--prefix", default="", help="prepend to --pattern/--words labels")
    p.add_argument("--suffix", default="", help="append to --pattern/--words labels")
    p.add_argument("-t", "--tld", default="com,ai", help="comma-separated (default com,ai)")
    p.add_argument("-n", "--limit", type=int, default=0, metavar="N", help="stop after N available names")
    p.add_argument("-o", "--out", metavar="FILE.csv", help="write every result as CSV")
    p.add_argument("--workers", type=int, default=64, help="DNS threads (default 64)")
    p.add_argument("--rdap-rate", type=float, default=5.0, help="RDAP requests/sec per registry (default 5)")
    p.add_argument("--rdap-base", action="append", default=[], metavar="TLD=URL",
                   help="override the RDAP server for a TLD")
    p.add_argument("--dns-server", action="append", metavar="IP[:PORT]",
                   help="repeatable; default 1.1.1.1, 8.8.8.8, 9.9.9.9 (IPv4)")
    p.add_argument("--dns-only", action="store_true",
                   help="skip RDAP; NXDOMAIN names are reported as 'likely', not confirmed")
    p.add_argument("--no-cache", action="store_true", help="ignore and don't update the taken-domain cache")
    p.add_argument("--cache-days", type=float, default=7.0, help="trust cached 'taken' for N days (default 7)")
    p.add_argument("-v", "--verbose", action="store_true", help="print every non-available result to stderr")
    args = p.parse_args(argv)

    if args.length is not None and args.length < 1:
        p.error("--length must be >= 1")
    if args.pattern is not None and (not args.pattern or set(args.pattern) - set(CLASSES)):
        p.error(f"--pattern may only use: {' '.join(CLASSES)}")
    for part in (args.prefix, args.suffix):
        if part and not re.fullmatch(r"[a-z0-9-]+", part):
            p.error("--prefix/--suffix may only contain a-z, 0-9 and '-'")
    overrides = {}
    for item in args.rdap_base:
        tld, eq, url = item.partition("=")
        if not eq or not url:
            p.error(f"--rdap-base expects TLD=URL, got {item!r}")
        overrides[tld.lower().lstrip(".")] = url.rstrip("/") + "/"
    args.rdap_overrides = overrides
    return args, p


def main(argv=None):
    args, parser = parse_args(argv)
    domains, total, tlds = build_domains(args, parser)

    stop = threading.Event()
    cache_dir = None if args.no_cache else default_cache_dir()
    dns = Dns(args.dns_server or DNS_SERVERS)
    rdap = Rdap(rate=args.rdap_rate, cache_dir=cache_dir, overrides=args.rdap_overrides, stop=stop)

    if dns.ns("google.com") != "delegated":
        print("warning: DNS lookups are failing (UDP/53 blocked?). Every name will fall through to "
              "RDAP, which is slow. Try --dns-server <your resolver>.", file=sys.stderr)
    if not args.dns_only:
        problems = self_test(tlds, dns, rdap)
        if problems:
            print("RDAP self-test failed, refusing to report results:", file=sys.stderr)
            for line in problems:
                print(f"  {line}", file=sys.stderr)
            return 2

    cache = TakenCache(cache_dir, args.cache_days)
    out = open(args.out, "w", newline="", encoding="utf-8") if args.out else None
    reporter = Reporter(total, args.verbose, out)
    checker = Checker(dns, rdap, cache.known, args.dns_only)

    def on_result(res):
        if res.status == "taken" and res.via != "cache":
            cache.add(res.domain)
        reporter.result(res)

    print(f"{total:,} candidates ({', '.join('.' + t for t in sorted(tlds))})", file=sys.stderr)
    started = time.monotonic()
    try:
        counts, interrupted = hunt(domains, checker, workers=args.workers, rdap_workers=8,
                                   limit=args.limit, stop=stop, on_result=on_result, on_tick=reporter.tick)
    finally:
        reporter.finish()
        cache.close()
        if out:
            out.close()

    summary = ", ".join(f"{counts[s]:,} {s}" for s in STATUSES if counts[s])
    print(f"checked {sum(counts[s] for s in STATUSES):,} in {time.monotonic() - started:.1f}s: "
          f"{summary or 'nothing'}{' (interrupted)' if interrupted else ''}", file=sys.stderr)
    if counts["likely"]:
        print("'likely' is DNS-only; rerun without --dns-only to confirm.", file=sys.stderr)
    if counts["unknown"]:
        print("'unknown' = rate limit or network trouble; rerun to retry (-v shows why).", file=sys.stderr)
    return 130 if interrupted else 0


if __name__ == "__main__":
    sys.exit(main())
