from pathlib import Path

ROOT = Path(r"c:\Users\KarienFerreira\Desktop\Project\COmbined")


def find_js_block(text: str, start_idx: int, open_char: str) -> tuple[int, int]:
    pairs = {"[": "]", "{": "}"}
    close_char = pairs[open_char]

    i = start_idx
    depth = 0
    in_str = False
    str_char = ""
    escape = False

    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""

        if in_str:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == str_char:
                in_str = False
            i += 1
            continue

        if ch in ('"', "'", "`"):
            in_str = True
            str_char = ch
            i += 1
            continue

        if ch == "/" and nxt == "/":
            i = text.find("\n", i)
            if i == -1:
                return start_idx, len(text)
            continue

        if ch == "/" and nxt == "*":
            end = text.find("*/", i + 2)
            if end == -1:
                return start_idx, len(text)
            i = end + 2
            continue

        if ch == open_char:
            depth += 1
        elif ch == close_char:
            depth -= 1
            if depth == 0:
                return start_idx, i

        i += 1

    raise ValueError(f"Unclosed block starting at {start_idx}")


def replace_declaration(html: str, decl_start: int, block_end: int, replacement: str) -> str:
    semi = html.find(";", block_end)
    if semi == -1:
        raise ValueError("Could not find declaration semicolon")
    return html[:decl_start] + replacement + html[semi + 1:]


# -------- Formal Scrolls --------
formal_path = ROOT / "Formal Scrolls.html"
formal = formal_path.read_text(encoding="utf-8")

fs_anchor = "const formalScrolls ="
fs_decl = formal.find(fs_anchor)
if fs_decl == -1:
    raise ValueError("formalScrolls declaration not found")
fs_open = formal.find("[", fs_decl)
fs_start, fs_end = find_js_block(formal, fs_open, "[")
formal_data = formal[fs_start:fs_end + 1]

(ROOT / "formal-scrolls-data.js").write_text(
    "window.formalScrollsData = " + formal_data + ";\n", encoding="utf-8"
)

formal = replace_declaration(formal, fs_decl, fs_end, "const formalScrolls = window.formalScrollsData")
formal = formal.replace(
    "    <script type=\"text/babel\">",
    "    <script src=\"formal-scrolls-data.js\"></script>\n    <script type=\"text/babel\">",
    1,
)
formal_path.write_text(formal, encoding="utf-8")


# -------- Monsters --------
monsters_path = ROOT / "Monsters.html"
monsters = monsters_path.read_text(encoding="utf-8")

im_anchor = "const initialMonsterData ="
im_decl = monsters.find(im_anchor)
if im_decl == -1:
    raise ValueError("initialMonsterData declaration not found")
im_open = monsters.find("[", im_decl)
im_start, im_end = find_js_block(monsters, im_open, "[")
initial_data = monsters[im_start:im_end + 1]

mt_anchor = "const monsterTypesData ="
mt_decl = monsters.find(mt_anchor)
if mt_decl == -1:
    raise ValueError("monsterTypesData declaration not found")
mt_open = monsters.find("[", mt_decl)
mt_start, mt_end = find_js_block(monsters, mt_open, "[")
type_data = monsters[mt_start:mt_end + 1]

(ROOT / "monsters-data.js").write_text(
    "window.initialMonsterData = " + initial_data + ";\n\n"
    + "window.monsterTypesData = " + type_data + ";\n",
    encoding="utf-8",
)

# Replace later declaration first to keep indexes stable
monsters = replace_declaration(monsters, mt_decl, mt_end, "const monsterTypesData = window.monsterTypesData")
# Recompute first declaration positions after prior edit
im_decl = monsters.find(im_anchor)
im_open = monsters.find("[", im_decl)
im_start, im_end = find_js_block(monsters, im_open, "[")
monsters = replace_declaration(monsters, im_decl, im_end, "const initialMonsterData = window.initialMonsterData")

monsters = monsters.replace(
    "    <script>\n    document.addEventListener('DOMContentLoaded', async () => {",
    "    <script src=\"monsters-data.js\"></script>\n    <script>\n    document.addEventListener('DOMContentLoaded', async () => {",
    1,
)
monsters_path.write_text(monsters, encoding="utf-8")


# -------- Production --------
prod_path = ROOT / "Production.html"
prod = prod_path.read_text(encoding="utf-8")

items_anchor = "let items ="
items_decl = prod.find(items_anchor)
if items_decl == -1:
    raise ValueError("items declaration not found")
items_open = prod.find("{", items_decl)
items_start, items_end = find_js_block(prod, items_open, "{")
items_data = prod[items_start:items_end + 1]

pot_anchor = "const potionUpdates ="
pot_decl = prod.find(pot_anchor)
if pot_decl == -1:
    raise ValueError("potionUpdates declaration not found")
pot_open = prod.find("[", pot_decl)
pot_start, pot_end = find_js_block(prod, pot_open, "[")
potion_data = prod[pot_start:pot_end + 1]

(ROOT / "production-data.js").write_text(
    "window.productionItems = " + items_data + ";\n\n"
    + "window.potionUpdatesData = " + potion_data + ";\n",
    encoding="utf-8",
)

prod = replace_declaration(prod, pot_decl, pot_end, "const potionUpdates = window.potionUpdatesData")
items_decl = prod.find(items_anchor)
items_open = prod.find("{", items_decl)
items_start, items_end = find_js_block(prod, items_open, "{")
prod = replace_declaration(prod, items_decl, items_end, "let items = window.productionItems")

prod = prod.replace(
    "    <script>",
    "    <script src=\"production-data.js\"></script>\n    <script>",
    1,
)
prod_path.write_text(prod, encoding="utf-8")

print("Extraction complete.")
