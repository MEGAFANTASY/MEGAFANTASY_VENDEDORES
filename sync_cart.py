import os
import re

ROOT = r"F:\3. MEGAFANTASY\2. APP-VENDEDORES"
SOURCE = os.path.join(ROOT, "megafantasy")
TARGETS = ["bluestar", "nexus", "megaworld", "elitech"]

def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write(path, text):
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)

def replace_first_default(text, target):
    lines = text.splitlines()
    if lines:
        lines[0] = re.sub(
            r"const company = window\.location\.pathname\.split\('/'\)\[1\] \|\| '[^']+';",
            f"const company = window.location.pathname.split('/')[1] || '{target}';",
            lines[0]
        )
    return "\n".join(lines) + ("\n" if text.endswith("\n") else "")

def build_facturas_html(source_html, target):
    html = source_html.replace("Facturas MEGAFANTASY", f"Facturas {target.upper()}")
    html = html.replace("<h1>MEGAFANTASY</h1>", f"<h1>{target.upper()}</h1>")
    return html

def patch_admin_html(admin_html, cart_html):
    return admin_html.replace(
        '  <script src="admin.js"></script>\n</body>',
        cart_html.rstrip() + '\n\n  <script src="admin.js"></script>\n</body>'
    )

CART_HTML = '''  <button id="cart-fab" class="cart-fab hidden" title="Ver carrito">
    🛒
    <span id="cart-count" class="cart-count">0</span>
  </button>

  <div id="cart-modal" class="modal hidden">
    <div class="modal-backdrop"></div>
    <div class="modal-content cart-modal-content">
      <h3>Liquidación</h3>
      <div class="cart-detail-grid">
        <div class="cart-label">Bodega:</div>
        <div class="cart-value" id="cart-bodega">-</div>
        <div class="cart-label">Vendedor:</div>
        <div class="cart-value" id="cart-vendedor">-</div>
        <div class="cart-label">Cliente:</div>
        <div class="cart-value" id="cart-cliente">-</div>
        <div class="cart-label">Ciudad:</div>
        <div class="cart-value" id="cart-ciudad">-</div>
        <div class="cart-label">Dirección:</div>
        <div class="cart-value" id="cart-direccion">-</div>
        <div class="cart-label">Fecha:</div>
        <div class="cart-value cart-value-long" id="cart-fecha">-</div>
        <div class="cart-label">Factura:</div>
        <div class="cart-value cart-value-long" id="cart-factura">-</div>
        <div class="cart-label">Total:</div>
        <div class="cart-value cart-value-number" id="cart-total">$0</div>
        <div class="cart-label">Flete:</div>
        <div class="cart-value cart-value-number" id="cart-flete">$0</div>
        <div class="cart-label">Abono:</div>
        <div class="cart-value cart-value-number" id="cart-abono">$0</div>
        <div class="cart-label">Saldo:</div>
        <div class="cart-value cart-value-number" id="cart-saldo">$0</div>
      </div>
      <div class="cart-items">
        <div class="cart-items-title">Facturas agregadas:</div>
        <div id="cart-items-list" class="cart-items-list"></div>
      </div>
      <div class="modal-actions">
        <button id="btn-cerrar-cart" class="nav-btn">Cerrar</button>
        <button id="btn-vaciar-cart" class="nav-btn">Vaciar</button>
        <button id="btn-liquidar-cart" class="nav-btn">Hacer liquidación</button>
      </div>
    </div>
  </div>'''

CART_CSS = '''.cart-add-btn {
  background: rgba(var(--company-rgb), 0.25);
  border: 1px solid rgba(var(--company-rgb), 0.55);
  color: var(--company-text);
}

.cart-add-btn:hover {
  background: var(--company-color);
  color: #fff;
  transform: scale(1.1);
}

.cart-add-btn.in-cart {
  background: #34d399;
  border-color: #34d399;
  color: #fff;
  cursor: default;
}

.cart-fab {
  position: fixed;
  bottom: clamp(20px, 5vw, 28px);
  right: clamp(20px, 5vw, 28px);
  width: clamp(58px, 14vw, 72px);
  height: clamp(58px, 14vw, 72px);
  border-radius: 50%;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(1.4rem, 5vw, 1.8rem);
  background: rgba(var(--company-rgb), 0.95);
  border: 1px solid var(--company-text);
  color: #fff;
  box-shadow: 0 0 24px var(--company-glow), 0 6px 20px rgba(0, 0, 0, 0.35);
  z-index: 90;
  transition: transform 0.15s, box-shadow 0.15s;
}

.cart-fab:hover {
  transform: scale(1.08);
  box-shadow: 0 0 32px var(--company-glow), 0 8px 24px rgba(0, 0, 0, 0.4);
}

.cart-count {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border-radius: 12px;
  background: #fff;
  color: var(--company-color);
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.cart-modal-content {
  max-width: min(520px, 94vw);
}

.cart-detail-grid {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 10px 14px;
  align-items: start;
  margin-bottom: clamp(18px, 4vw, 24px);
}

.cart-label {
  color: rgba(255, 255, 255, 0.55);
  font-size: clamp(0.75rem, 2.2vw, 0.85rem);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-top: 2px;
}

.cart-value {
  color: var(--company-text);
  font-size: clamp(0.85rem, 2.6vw, 0.95rem);
  font-weight: 600;
  text-shadow: 0 0 10px var(--company-glow);
  word-break: break-word;
}

.cart-value-long {
  font-size: clamp(0.75rem, 2.2vw, 0.85rem);
  font-weight: 500;
}

.cart-value-number {
  color: #fff;
  font-weight: 700;
}

.cart-items {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: clamp(12px, 3vw, 16px);
  margin-bottom: clamp(18px, 4vw, 24px);
}

.cart-items-title {
  color: rgba(255, 255, 255, 0.7);
  font-size: clamp(0.75rem, 2.2vw, 0.85rem);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.cart-items-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 140px;
  overflow-y: auto;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  font-size: clamp(0.75rem, 2.2vw, 0.85rem);
  color: rgba(255, 255, 255, 0.9);
}

.cart-item-factura {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cart-item-remove {
  width: 20px;
  height: 20px;
  padding: 0;
  margin: 0;
  border-radius: 50%;
  background: rgba(255, 107, 107, 0.2);
  border: 1px solid rgba(255, 107, 107, 0.5);
  color: rgba(255, 107, 107, 0.95);
  font-size: 0.7rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: none;
}

.cart-item-remove:hover {
  background: rgba(255, 107, 107, 0.35);
  transform: scale(1.1);
  box-shadow: none;
}
'''

def patch_styles(css):
    marker = '''.icon-link:hover {
  background: var(--company-color);
  color: var(--company-text);
  transform: scale(1.1);
}

.icon-disabled {'''
    replacement = '''.icon-link:hover {
  background: var(--company-color);
  color: var(--company-text);
  transform: scale(1.1);
}

''' + CART_CSS + '''
.icon-disabled {'''
    if marker not in css:
        raise ValueError("Could not find .icon-link:hover -> .icon-disabled insertion point")
    return css.replace(marker, replacement, 1)

def main():
    src_admin_js = read(os.path.join(SOURCE, "admin.js"))
    src_facturas_js = read(os.path.join(SOURCE, "facturas.js"))
    src_facturas_html = read(os.path.join(SOURCE, "facturas.html"))

    for target in TARGETS:
        folder = os.path.join(ROOT, target)
        print(f"Updating {target}...")

        # 1. admin.js
        write(os.path.join(folder, "admin.js"), replace_first_default(src_admin_js, target))

        # 2. facturas.js
        write(os.path.join(folder, "facturas.js"), replace_first_default(src_facturas_js, target))

        # 3. facturas.html
        write(os.path.join(folder, "facturas.html"), build_facturas_html(src_facturas_html, target))

        # 4. admin.html
        write(os.path.join(folder, "admin.html"), patch_admin_html(read(os.path.join(folder, "admin.html")), CART_HTML))

        # 5. styles.css
        write(os.path.join(folder, "styles.css"), patch_styles(read(os.path.join(folder, "styles.css"))))

    print("Done.")

if __name__ == "__main__":
    main()
