#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, HTTPServer
import os

class SPAHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Redirect /folder to /folder/ so relative paths resolve correctly
        if self.path != '/' and not self.path.endswith('/'):
            root = self.directory or os.getcwd()
            abspath = os.path.join(root, self.path.lstrip('/'))
            if os.path.isdir(abspath):
                self.send_response(301)
                self.send_header('Location', self.path + '/')
                self.end_headers()
                return
        return super().do_GET()

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
