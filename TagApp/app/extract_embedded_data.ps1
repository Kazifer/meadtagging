$ErrorActionPreference = 'Stop'

$root = 'c:\Users\KarienFerreira\Desktop\Project\COmbined'

function Find-JsBlock {
    param(
        [string]$Text,
        [int]$StartIndex,
        [char]$OpenChar
    )

    $closeChar = if ($OpenChar -eq '[') { ']' } elseif ($OpenChar -eq '{') { '}' } else { throw "Unsupported opener: $OpenChar" }

    $i = $StartIndex
    $depth = 0
    $inStr = $false
    [char]$strChar = [char]0
    $escape = $false

    while ($i -lt $Text.Length) {
        [char]$ch = $Text[$i]
        [char]$nxt = if ($i + 1 -lt $Text.Length) { $Text[$i + 1] } else { [char]0 }

        if ($inStr) {
            if ($escape) {
                $escape = $false
            }
            elseif ($ch -eq '\') {
                $escape = $true
            }
            elseif ($ch -eq $strChar) {
                $inStr = $false
            }
            $i++
            continue
        }

        if ($ch -eq '"' -or $ch -eq "'" -or [int][char]$ch -eq 96) {
            $inStr = $true
            $strChar = $ch
            $i++
            continue
        }

        if ($ch -eq '/' -and $nxt -eq '/') {
            $nl = $Text.IndexOf("`n", $i)
            if ($nl -lt 0) { return @{ Start = $StartIndex; End = $Text.Length - 1 } }
            $i = $nl + 1
            continue
        }

        if ($ch -eq '/' -and $nxt -eq '*') {
            $endComment = $Text.IndexOf('*/', $i + 2)
            if ($endComment -lt 0) { return @{ Start = $StartIndex; End = $Text.Length - 1 } }
            $i = $endComment + 2
            continue
        }

        if ($ch -eq $OpenChar) {
            $depth++
        }
        elseif ($ch -eq $closeChar) {
            $depth--
            if ($depth -eq 0) {
                return @{ Start = $StartIndex; End = $i }
            }
        }

        $i++
    }

    throw "Unclosed block at $StartIndex"
}

function Replace-Declaration {
    param(
        [string]$Html,
        [int]$DeclStart,
        [int]$BlockEnd,
        [string]$Replacement
    )

    $semi = $Html.IndexOf(';', $BlockEnd)
    if ($semi -lt 0) { throw 'Could not find declaration semicolon.' }

    return $Html.Substring(0, $DeclStart) + $Replacement + $Html.Substring($semi + 1)
}

# -------- Formal Scrolls --------
$formalPath = Join-Path $root 'Formal Scrolls.html'
$formal = Get-Content -Path $formalPath -Raw

$fsAnchor = 'const formalScrolls ='
$fsDecl = $formal.IndexOf($fsAnchor)
if ($fsDecl -lt 0) { throw 'formalScrolls declaration not found.' }
$fsOpen = $formal.IndexOf('[', $fsDecl)
$fsBlock = Find-JsBlock -Text $formal -StartIndex $fsOpen -OpenChar '['
$formalData = $formal.Substring($fsBlock.Start, $fsBlock.End - $fsBlock.Start + 1)

Set-Content -Path (Join-Path $root 'formal-scrolls-data.js') -Value ("window.formalScrollsData = $formalData;`r`n") -Encoding UTF8

$formal = Replace-Declaration -Html $formal -DeclStart $fsDecl -BlockEnd $fsBlock.End -Replacement 'const formalScrolls = window.formalScrollsData'
$formal = $formal.Replace('    <script type="text/babel">', "    <script src=""formal-scrolls-data.js""></script>`r`n    <script type=""text/babel"">")
Set-Content -Path $formalPath -Value $formal -Encoding UTF8

# -------- Monsters --------
$monstersPath = Join-Path $root 'Monsters.html'
$monsters = Get-Content -Path $monstersPath -Raw

$imAnchor = 'const initialMonsterData ='
$imDecl = $monsters.IndexOf($imAnchor)
if ($imDecl -lt 0) { throw 'initialMonsterData declaration not found.' }
$imOpen = $monsters.IndexOf('[', $imDecl)
$imBlock = Find-JsBlock -Text $monsters -StartIndex $imOpen -OpenChar '['
$initialData = $monsters.Substring($imBlock.Start, $imBlock.End - $imBlock.Start + 1)

$mtAnchor = 'const monsterTypesData ='
$mtDecl = $monsters.IndexOf($mtAnchor)
if ($mtDecl -lt 0) { throw 'monsterTypesData declaration not found.' }
$mtOpen = $monsters.IndexOf('[', $mtDecl)
$mtBlock = Find-JsBlock -Text $monsters -StartIndex $mtOpen -OpenChar '['
$typeData = $monsters.Substring($mtBlock.Start, $mtBlock.End - $mtBlock.Start + 1)

$monsterDataOut = "window.initialMonsterData = $initialData;`r`n`r`nwindow.monsterTypesData = $typeData;`r`n"
Set-Content -Path (Join-Path $root 'monsters-data.js') -Value $monsterDataOut -Encoding UTF8

$monsters = Replace-Declaration -Html $monsters -DeclStart $mtDecl -BlockEnd $mtBlock.End -Replacement 'const monsterTypesData = window.monsterTypesData'
$imDecl = $monsters.IndexOf($imAnchor)
$imOpen = $monsters.IndexOf('[', $imDecl)
$imBlock = Find-JsBlock -Text $monsters -StartIndex $imOpen -OpenChar '['
$monsters = Replace-Declaration -Html $monsters -DeclStart $imDecl -BlockEnd $imBlock.End -Replacement 'const initialMonsterData = window.initialMonsterData'

$monsters = $monsters.Replace("    <script>`r`n    document.addEventListener('DOMContentLoaded', async () => {", "    <script src=""monsters-data.js""></script>`r`n    <script>`r`n    document.addEventListener('DOMContentLoaded', async () => {")
Set-Content -Path $monstersPath -Value $monsters -Encoding UTF8

# -------- Production --------
$prodPath = Join-Path $root 'Production.html'
$prod = Get-Content -Path $prodPath -Raw

$itemsAnchor = 'let items ='
$itemsDecl = $prod.IndexOf($itemsAnchor)
if ($itemsDecl -lt 0) { throw 'items declaration not found.' }
$itemsOpen = $prod.IndexOf('{', $itemsDecl)
$itemsBlock = Find-JsBlock -Text $prod -StartIndex $itemsOpen -OpenChar '{'
$itemsData = $prod.Substring($itemsBlock.Start, $itemsBlock.End - $itemsBlock.Start + 1)

$potAnchor = 'const potionUpdates ='
$potDecl = $prod.IndexOf($potAnchor)
if ($potDecl -lt 0) { throw 'potionUpdates declaration not found.' }
$potOpen = $prod.IndexOf('[', $potDecl)
$potBlock = Find-JsBlock -Text $prod -StartIndex $potOpen -OpenChar '['
$potionData = $prod.Substring($potBlock.Start, $potBlock.End - $potBlock.Start + 1)

$prodDataOut = "window.productionItems = $itemsData;`r`n`r`nwindow.potionUpdatesData = $potionData;`r`n"
Set-Content -Path (Join-Path $root 'production-data.js') -Value $prodDataOut -Encoding UTF8

$prod = Replace-Declaration -Html $prod -DeclStart $potDecl -BlockEnd $potBlock.End -Replacement 'const potionUpdates = window.potionUpdatesData'
$itemsDecl = $prod.IndexOf($itemsAnchor)
$itemsOpen = $prod.IndexOf('{', $itemsDecl)
$itemsBlock = Find-JsBlock -Text $prod -StartIndex $itemsOpen -OpenChar '{'
$prod = Replace-Declaration -Html $prod -DeclStart $itemsDecl -BlockEnd $itemsBlock.End -Replacement 'let items = window.productionItems'

$prod = $prod.Replace('    <script>', "    <script src=""production-data.js""></script>`r`n    <script>")
Set-Content -Path $prodPath -Value $prod -Encoding UTF8

Write-Host 'Extraction complete.'
