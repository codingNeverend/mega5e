
# === Script : nouveau design table talents ===
# Génère le HTML, l'applique à actor-sheet.html et pnj-actor-sheet.html, et ajoute le CSS.
$ErrorActionPreference = 'Stop'

# ---- Macro pour une cellule de valeur (avec guard verouille + 99) ----
# Exemple d'appel : tval "interpreter"
function tval([string]$k) {
@"
d {{#if system.verouille}}{{#ifequal system.talents.$k.value 99}}X{{else}}<input disabled="disabled" class="comb tnt-vi" type="text" name="system.talents.$k.value" value="{{system.talents.$k.value}}" data-dtype="Number"/>{{/ifequal}}{{else}}<input class="comb tnt-vi" type="text" name="system.talents.$k.value" value="{{system.talents.$k.value}}" data-dtype="Number"/>{{/if}}
"@.Trim()
}

# ---- Macro pour une cellule nom + dots (sub-talent) ----
function tname([string]$k, [string]$extra='') {
$lbl = "{{system.talents.$k.label}}"
$desc= "{{system.talents.$k.description}}"
@"
<td class="tnt-nc"><div class="tnt-nr"><div class="tooltip"><span class="talents_rollable" value="$k">$lbl</span><span class="tooltiptext">$desc</span></div><span class="tnt-dots"></span></div></td>
"@.Trim()
}

# ---- Macro pour une cellule nom (groupe, bold) ----
function tname_g([string]$k) {
$lbl = "{{system.talents.$k.label}}"
$desc= "{{system.talents.$k.description}}"
@"
<td class="tnt-nc"><div class="tnt-nr"><div class="tooltip"><span class="talents_rollable" value="$k"><b>$lbl</b></span><span class="tooltiptext">$desc</span></div><span class="tnt-dots"></span></div></td>
"@.Trim()
}

# ---- Macro ligne complète (6 colonnes : 3 paires nom/valeur) ----
function trow([string]$k1,[string]$k2,[string]$k3,[bool]$grp=$false) {
$cls  = if ($grp) { 'tnt-gr' } else { '' }
$nc1  = if ($grp) { tname_g $k1 } else { tname $k1 }
$nc2  = if ($grp) { tname_g $k2 } else { tname $k2 }
$nc3  = if ($grp) { tname_g $k3 } else { tname $k3 }
$vc1  = "<td class=`"tnt-vc`">$(tval $k1)</td>"
$vc2  = "<td class=`"tnt-vc`">$(tval $k2)</td>"
$vc3  = "<td class=`"tnt-vc`">$(tval $k3)</td>"
if ($grp) {
"			<tr class=`"tnt-gr`">
				$nc1
				$vc1
				$nc2
				$vc2
				$nc3
				$vc3
			</tr>"
} else {
"			<tr>
				$nc1
				$vc1
				$nc2
				$vc2
				$nc3
				$vc3
			</tr>"
}
}

# ---- Entête domaines ----
$headerComm = @'
{{comp.label}}COMMUNICATION <span class="tnt-dd">d<input {{#if system.verouille}}disabled="disabled"{{/if}} class="comb tnt-di" type="text" name="system.domaines.communication.value" value="{{system.domaines.communication.value}}" data-dtype="Number"/></span>
'@.Trim()

$headerPrat = @'
{{comp.label}}PRATIQUE <span class="tnt-dd">d<input {{#if system.verouille}}disabled="disabled"{{/if}} class="comb tnt-di" type="text" name="system.domaines.pratique.value" value="{{system.domaines.pratique.value}}" data-dtype="Number"/></span>
'@.Trim()

$headerCult = @'
{{comp.label}}CULTURE MILIEU...<span class="info_talents" value="talents">&nbsp;<img class="icon_info" src="systems/mega/images/info.svg"></span> <span class="tnt-dd">d<input {{#if system.verouille}}disabled="disabled"{{/if}} class="comb tnt-di" type="text" name="system.domaines.culture_milieux.value" value="{{system.domaines.culture_milieux.value}}" data-dtype="Number"/></span>
'@.Trim()

# ---- Construction du TBODY ----
$groups = @(
    # grp1: INTERPRÉTER | OBSERVER | HABITÉS
    trow 'interpreter' 'observer' 'habites' $true
    "			{{#unless (courtMetrage)}}"
    trow 'langage_corporel' 'chercher_objet' 'megalopoles'
    trow 'codes' 'remarquer_detail' 'cites'
    trow 'expressions_artistiques' 'veille_vigilance' 'rural'
    "			{{/unless}}"

    # grp2: PARAÎTRE | FURTIVITÉ | SAUVAGES
    trow 'paraitre' 'furtivite' 'sauvages' $true
    "			{{#unless (courtMetrage)}}"
    trow 'bluffer_deguisement' 'agir_sans_bruit' 'foret_jungle'
    trow 'impressionner' 'se_disimuler_filer' 'savane_steppe_marecages'
    trow 'paraitre_sans_interet' 'camouflage' 'desert'
    "			{{/unless}}"

    # grp3: PERSUADER | ACROBATIES | SCIENTECHS
    trow 'persuader' 'acrobaties' 'scientechs' $true
    "			{{#unless (courtMetrage)}}"
    trow 'convaincre_expliquer' 'minutie' 'indus'
    trow 'baratiner_tromper_culot' 'acrobatie' 'militaire'
    trow 'imposer_ses_vues' 'effort_prolonge' 'vaisseaux'
    "			{{/unless}}"

    # grp4: TISSER DES LIENS | MANIPS | POUVOIR
    trow 'tisser_des_liens' 'manips' 'pouvoir' $true
    "			{{#unless (courtMetrage)}}"
    trow 'charmer_captiver_apprivoiser' 'vivant' 'business'
    trow 'inspirer_fidelite' 'mecanique' 'autorites'
    trow 'assujettir_dompter' 'electronique' 'spirituel'
    "			{{/unless}}"

    # grp5: DIRIGER | CONDUIRE | CLANDESTINS
    trow 'diriger' 'conduire' 'clandestins' $true
    "			{{#unless (courtMetrage)}}"
    trow 'coordonner' 'animal' 'pegre'
    trow 'commander' 'vehicules_legers' 'contestations'
    trow 'former' 'vehicules_lourds' 'marge'
    "			{{/unless}}"
)
$tbody = $groups -join "`n"

# ---- Assemblage final ----
$newHTML = @"
<div class="tnt-outer">
			<div class="tnt-side-label"><span>TALENTS</span></div>
			<table class="tnt-table">
				<colgroup>
					<col class="tnt-col-name"/><col class="tnt-col-val"/>
					<col class="tnt-col-name"/><col class="tnt-col-val"/>
					<col class="tnt-col-name"/><col class="tnt-col-val"/>
				</colgroup>
				<thead>
					<tr>
						<th class="tnt-dh tnt-comm" colspan="2">$headerComm</th>
						<th class="tnt-dh tnt-prat" colspan="2">$headerPrat</th>
						<th class="tnt-dh tnt-cult" colspan="2">$headerCult</th>
					</tr>
				</thead>
				<tbody>
$tbody
				</tbody>
			</table>
		</div>
"@

# Sauvegarde dans temp pour inspection
$newHTML | Set-Content -Path "$env:TEMP\new_talents.html" -Encoding UTF8
Write-Host "HTML generated, length=$($newHTML.Length)"

# ========== actor-sheet.html ==========
$f1 = 'e:\FoundryVTT\Data\systems\mega\templates\actor-sheet.html'
$c1 = [IO.File]::ReadAllText($f1, [Text.Encoding]::UTF8)
$startTag = '<table class="talents">'
$endTag   = '</table>'
$si1 = $c1.IndexOf($startTag)
$ei1 = $c1.IndexOf($endTag, $si1) + $endTag.Length
$c1new = $c1.Substring(0, $si1) + $newHTML + $c1.Substring($ei1)
[IO.File]::WriteAllText($f1, $c1new, [Text.Encoding]::UTF8)
Write-Host "actor-sheet done. tnt-outer present: $($c1new.Contains('tnt-outer'))"

# ========== pnj-actor-sheet.html ==========
$f2 = 'e:\FoundryVTT\Data\systems\mega\templates\pnj-actor-sheet.html'
$c2 = [IO.File]::ReadAllText($f2, [Text.Encoding]::UTF8)
$si2 = $c2.IndexOf($startTag)
$ei2 = $c2.IndexOf($endTag, $si2) + $endTag.Length
$c2new = $c2.Substring(0, $si2) + $newHTML + $c2.Substring($ei2)
[IO.File]::WriteAllText($f2, $c2new, [Text.Encoding]::UTF8)
Write-Host "pnj-actor-sheet done. tnt-outer present: $($c2new.Contains('tnt-outer'))"

# ========== mega.css : ajouter les règles .tnt-* ==========
$cssFile = 'e:\FoundryVTT\Data\systems\mega\styles\mega.css'
$cssContent = [IO.File]::ReadAllText($cssFile, [Text.Encoding]::UTF8)

# On insère avant ".mega table.talents_annexes" (existant)
$cssAnchor = '.mega table.talents_annexes'
$cssNew = @'
/* === TALENTS : Nouveau design (tnt-) === */
.mega .tnt-outer {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  margin-left: 4px;
  margin-right: 6px;
  margin-bottom: 10px;
}
.mega .tnt-side-label {
  display: flex;
  align-items: center;
  justify-content: center;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  background: linear-gradient(180deg, #c0392b 0%, #8e1a10 100%);
  color: #fff;
  font-weight: bold;
  font-size: 10px;
  letter-spacing: 3px;
  padding: 6px 3px;
  border-radius: var(--corner-radius) 0 0 var(--corner-radius);
  min-width: 16px;
  user-select: none;
}
.mega .tnt-table {
  flex: 1;
  width: 100%;
  border-collapse: collapse;
  background-color: var(--table-talents, #f4f6fa);
  border-radius: 0 var(--corner-radius) var(--corner-radius) 0;
  box-shadow: rgba(0,0,0,0.12) 0px 1px 3px, rgba(0,0,0,0.24) 0px 1px 2px;
}
.mega .tnt-table:hover {
  box-shadow: 0 0 0 2px var(--table-talents), -1px 2px 10px 1px rgba(0,0,0,0.7);
}
/* En-têtes de domaine */
.mega .tnt-dh {
  font-size: 11px;
  font-weight: bold;
  padding: 4px 5px;
  color: #fff;
  text-align: left;
  white-space: nowrap;
}
.mega .tnt-comm { background: linear-gradient(135deg, #b52828 0%, #e05050 100%); }
.mega .tnt-prat {
  background: linear-gradient(135deg, #14538c 0%, #2980b9 100%);
  border-left: 2px solid rgba(255,255,255,0.35);
  border-right: 2px solid rgba(255,255,255,0.35);
}
.mega .tnt-cult { background: linear-gradient(135deg, #146040 0%, #27ae60 100%); }
/* Badge dé dans l'en-tête */
.mega .tnt-dd {
  display: inline-block;
  background: rgba(0,0,0,0.22);
  border-radius: 3px;
  padding: 1px 5px;
  margin-left: 5px;
  font-style: italic;
  letter-spacing: 1px;
}
.mega .tnt-di {
  width: 20px;
  text-align: center;
  border: none;
  background: transparent;
  color: #fff;
  font-weight: bold;
  font-size: 11px;
  padding: 0;
}
/* Cellules nom */
.mega .tnt-nc {
  padding: 1px 2px !important;
  max-width: 120px;
  overflow: hidden;
}
.mega .tnt-nr {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
}
.mega .tnt-nr .tooltip { flex-shrink: 0; }
.mega .tnt-dots {
  flex: 1;
  border-bottom: 1px dotted rgba(0,0,0,0.3);
  margin: 0 3px 2px;
  min-width: 4px;
}
/* Cellules valeur */
.mega .tnt-vc {
  padding: 1px 5px 1px 0 !important;
  white-space: nowrap;
  font-style: italic;
  font-weight: bold;
  color: #333;
  text-align: right;
  width: 38px;
}
.mega .tnt-vi {
  width: 20px !important;
  text-align: center;
  border: none;
  background: transparent;
  font-style: italic;
  font-weight: bold;
  color: #333;
  padding: 0;
}
/* Lignes groupes */
.mega .tnt-gr { background: rgba(30,70,130,0.07) !important; }
.mega .tnt-gr .talents_rollable { font-weight: bold !important; }
/* Alternance légère sur lignes paires */
.mega .tnt-table tbody tr:nth-child(even) { background: rgba(0,0,0,0.03); }
/* Noms cliquables */
.mega .tnt-nc .talents_rollable {
  font-size: 11px;
  cursor: pointer;
}
.mega .tnt-nc .talents_rollable:hover {
  text-decoration: underline;
  color: #1a58b0;
}
/* Largeur colonnes */
.mega .tnt-col-name { width: 30%; }
.mega .tnt-col-val  { width: 3%; }
/* Tooltip */
.mega .tnt-table .tooltip { position: relative; }
.mega .tnt-table .tooltip .tooltiptext {
  display: none;
  position: absolute;
  z-index: 9999;
  background: rgba(20,30,60,0.92);
  color: #fff;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  white-space: nowrap;
  pointer-events: none;
  left: 50%;
  transform: translateX(-50%);
  top: 18px;
}
.mega .tnt-table .tooltip:hover .tooltiptext { display: block; }
/* === fin tnt- === */

'@

if ($cssContent.Contains($cssAnchor)) {
    $cssUpdated = $cssContent.Replace($cssAnchor, $cssNew + $cssAnchor)
    [IO.File]::WriteAllText($cssFile, $cssUpdated, [Text.Encoding]::UTF8)
    Write-Host "mega.css updated. tnt-side-label present: $($cssUpdated.Contains('tnt-side-label'))"
} else {
    Write-Host "ATTENTION: ancre '$cssAnchor' non trouvée dans mega.css — ajout en fin de fichier"
    $cssUpdated = $cssContent + "`n" + $cssNew
    [IO.File]::WriteAllText($cssFile, $cssUpdated, [Text.Encoding]::UTF8)
    Write-Host "mega.css updated (fin de fichier)."
}
Write-Host "=== ALL DONE ==="
