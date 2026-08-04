$f = "e:\FoundryVTT\Data\systems\mega\templates\actor-sheet.html"
$c = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)
$nl = "`r`n"
$t6="`t"*6; $t7="`t"*7; $t8="`t"*8; $t9="`t"*9; $t10="`t"*10; $t11="`t"*11
$i = $c.IndexOf('<table class="cumul">')
$end = $c.IndexOf("</table>", $i) + 8
$old = $c.Substring($i, $end - $i)
$new = ($t6+'<div class="cumul-panel">'+$nl+$t7+'<button class="cumul-toggle" type="button">'+$nl+$t8+'<span class="cumul-toggle-icon">&#9876;</span>'+$nl+$t8+'<span class="cumul-toggle-label">CUMUL &amp; D&Eacute;FIS</span>'+$nl+$t8+'<span class="cumul-arrow">&#9658;</span>'+$nl+$t7+'</button>'+$nl+$t7+'<div class="cumul-body">'+$nl+$t8+'<div class="cumul-inner">'+$nl+$t9+'<div class="cumul-meter-row">'+$nl+$t10+'<meter class="cumul-meter" value="{{system.cumul_defi.value}}"'+$nl+$t11+'min="{{system.cumul_defi.min}}"'+$nl+$t11+'max="{{system.cumul_defi.max}}"></meter>'+$nl+$t10+'<span class="cumul-frac">'+$nl+$t11+'<input class="cumul-input" type="text" name="system.cumul_defi.value"'+$nl+$t12+' value="{{system.cumul_defi.value}}" data-dtype="Number" />'+$nl+$t11+'<span class="cumul-sep">/</span>'+$nl+$t11+'<input class="cumul-input" type="text" name="system.cumul_defi.max"'+$nl+$t12+' value="{{system.cumul_defi.max}}" data-dtype="Number" />'+$nl+$t10+'</span>'+$nl+$t9+'</div>'+$nl+$t8+'</div>'+$nl+$t7+'</div>'+$nl+$t6+'</div>')
$cn = $c.Substring(0, $i) + $new + $c.Substring($end)
[IO.File]::WriteAllText($f, $cn, [Text.Encoding]::UTF8)
Write-Host "Done: $($cn.Length), panel=$($cn.Contains('cumul-panel'))"