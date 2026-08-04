$f = "e:\FoundryVTT\Data\systems\mega\templates\actor-sheet.html"
$c = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)
$i = $c.IndexOf('<table class="cumul">')
$end = $c.IndexOf('</table>', $i) + 8
$old = $c.Substring($i, $end - $i)
$nl = "`r`n"
$t7 = "`t"*7; $t8 = "`t"*8; $t9 = "`t"*9; $t10 = "`t"*10; $t11 = "`t"*11
$new = ($t7+'<div class="cumul-panel">'+$nl+$t8+'<button class="cumul-toggle" type="button">'+$nl+$t9+'<span class="cumul-toggle-icon">&#9876;</span>'+$nl+$t9+'<span class="cumul-toggle-label">CUMUL &amp; D&Eacute;FIS</span>'+$nl+$t9+'<span class="cumul-arrow">&#9658;</span>'+$nl+$t8+'</button>'+$nl+$t8+'<div class="cumul-body">'+$nl+$t9+'<div class="cumul-inner">'+$nl+$t10+'<div class="cumul-meter-row">'+$nl+$t11+'<meter class="cumul-meter" value="{{system.cumul_defi.value}}"'+$nl+$t11+' min="{{system.cumul_defi.min}}"'+$nl+$t11+' max="{{system.cumul_defi.max}}"></meter>'+$nl+$t11+'<span class="cumul-frac">'+$nl+$t11+'<input class="cumul-input" type="text" name="system.cumul_defi.value"'+$nl+$t11+' value="{{system.cumul_defi.value}}" data-dtype="Number" />'+$nl+$t11+'<span class="cumul-sep">/</span>'+$nl+$t11+'<input class="cumul-input" type="text" name="system.cumul_defi.max"'+$nl+$t11+' value="{{system.cumul_defi.max}}" data-dtype="Number" />'+$nl+$t11+'</span>'+$nl+$t10+'</div>'+$nl+$t9+'</div>'+$nl+$t8+'</div>'+$nl+$t7+'</div>')
$cn = $c.Replace($old, $new)
[IO.File]::WriteAllText($f, $cn, [Text.Encoding]::UTF8)
Write-Host "Done. Old len=$($old.Length), new found=$($cn.Contains('cumul-panel'))"