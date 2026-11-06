"""Tiny static web server for testing the web app on your own computer.
Unlike `python -m http.server` it supports HTTP Range requests, which the map tile file (data/soil.pmtiles) needs.
Usage:  python tools/serve.py [folder] [port]      default: docs  8766     then open http://localhost:8766/"""
import http.server, os, re, sys, functools


class RangeHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def send_head(self):
        rng = self.headers.get("Range")
        path = self.translate_path(self.path)
        m = re.match(r"bytes=(\d*)-(\d*)$", rng or "")
        if not m or not os.path.isfile(path):
            self._range = None
            return super().send_head()
        size = os.path.getsize(path)
        start = int(m.group(1)) if m.group(1) else max(0, size - int(m.group(2)))
        end = int(m.group(2)) if (m.group(1) and m.group(2)) else size - 1
        end = min(end, size - 1)
        if start > end:
            self.send_error(416, "Requested Range Not Satisfiable")
            return None
        f = open(path, "rb")
        f.seek(start)
        self._range = (start, end)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        return f

    def copyfile(self, source, outputfile):
        if getattr(self, "_range", None):
            remaining = self._range[1] - self._range[0] + 1
            while remaining > 0:
                chunk = source.read(min(65536, remaining))
                if not chunk:
                    break
                outputfile.write(chunk)
                remaining -= len(chunk)
        else:
            super().copyfile(source, outputfile)

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    folder = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs"))
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8766
    RangeHandler.extensions_map.update({".js": "text/javascript", ".webmanifest": "application/manifest+json", ".pmtiles": "application/octet-stream"})
    handler = functools.partial(RangeHandler, directory=folder)
    print("serving", folder, "at http://localhost:%d/  (Ctrl+C to stop)" % port, flush=True)
    http.server.ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()
