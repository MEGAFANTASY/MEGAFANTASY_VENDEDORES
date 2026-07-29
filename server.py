#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, HTTPServer
import os

class SPAHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        root = self.directory or os.getcwd()
        abspath = os.path.join(root, path.lstrip('/'))
        if os.path.isdir(abspath):
            index = os.path.join(abspath, 'index.html')
            if os.path.exists(index):
                return index
        if os.path.exists(abspath):
            return abspath
        fallback = os.path.join(root, 'index.html')
        return fallback if os.path.exists(fallback) else abspath

if __name__ == '__main__':
    print('CWD:', os.getcwd())
    print('FILES:', os.listdir(os.getcwd()))
    server = HTTPServer(('0.0.0.0', 8000), SPAHandler)
    print('Serving on http://0.0.0.0:8000')
    server.serve_forever()
