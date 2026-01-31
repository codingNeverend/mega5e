switch (type_pouvoir) {
  case "TRANSIT":
    grade = this.actor.system.pouvoirs.pouvoir_transit.grade;
    break;

  case "TRANSFERT":
    grade = this.actor.system.pouvoirs.pouvoir_transfert.grade;
    break;

  default:
    grade = this.actor.system.pouvoirs.pouvoir_psi_1.grade;
    break;
}

let bkground_style =
  'style="background-color:rgba(12, 166, 71, 0.4);border:solid 1px; vertical-align: top;padding: 5px;border-radius: 5px;box-shadow: -1px 2px 5px 1px rgba(0, 0, 0, 0.7);"';
let backgrounds = Array(12).fill(
  'style="border:solid 1px; padding: 5px;vertical-align: top;border-radius: 5px;box-shadow: -1px 2px 5px 1px rgba(0, 0, 0, 0.7);"'
);

for (let i = 0; i < grade; i++) {
  backgrounds[i] = bkground_style;
}

let [
  bkground1,
  bkground2,
  bkground3,
  bkground4,
  bkground5,
  bkground6,
  bkground7,
  bkground8,
  bkground9,
  bkground10,
  bkground11,
  bkground12,
] = backgrounds;

switch (type_pouvoir) {
  case "TRANSIT":
    tab1 = "Transit";
    tab2 = "Aide";
    icon1 = "triangle-target.svg";
    icon2 = "uncertainty.svg";
    titre = "Pouvoir MEGA . Transit";
    description1 =
      '<table style="background: transparent;border:none; border-collapse: separate;border-spacing: 15px; "><tr><td ' +
      bkground1 +
      'width="50%"><b>Grade 1.</b>&nbsp;Le méga ne peut que partir de Norjane avec l’aide des sages mégas vers la porte de transit du monde de sa mission, puis revenir sur Norjane depuis la même porte, il ne peut emporter qu’un très léger matos porté.' +
      "</td><td " +
      bkground2 +
      'width="50%"><h4><strong>Grade 2.</strong>&nbsp;Le méga peut partir de Norjane seul, sans l’aide des sages mégas, vers la porte de transit du monde de sa mission, puis revenir sur Norjane depuis la même porte, il ne peut emporter que le matos porté.</tr><tr><td ' +
      bkground3 +
      'width="50%">' +
      "<h4><strong>Grade 3.</strong>&nbsp;Le méga peut partir de Norjane vers la porte de transit du monde de sa mission, puis revenir sur Norjane depuis la même porte, il peut aussi emporter un matos conséquent, un passager au moins résonnant, et un véhicule léger." +
      "</td><td " +
      bkground4 +
      'width="50%"><h4><strong>Grade 4.</strong>&nbsp;Le méga peut partir de Norjane vers la porte de transit du monde de sa mission, se déplacer sur ce monde de porte en porte (dont les empreintes ont été mémorisées avant de partir), puis revenir sur Norjane depuis une de ces portes, il peut aussi emporter un matos conséquent, un passager (même ordinaire, non résonnant), et un véhicule léger.</tr><tr><td ' +
      bkground5 +
      'width="50%">' +
      "<h4><strong>Grade 5.</strong>&nbsp;Le méga peut partir de n’importe quelle porte vers la porte de transit du monde de sa mission, se déplacer de porte en porte (empreintes mémorisées avant de partir ou découvertes en mission), même sur des mondes différents, dans des univers parallèles, il peut aussi emporter un matos conséquent, deux passagers (même ordinaire, non résonnant), et un véhicule lourd, le méga peut détecter et lire l’empreinte d’une porte à courte portée (points de résonnance restants X 10m) et la mémoriser." +
      "</td><td " +
      bkground6 +
      'width="50%"><h4><strong>Grade 6.</strong>&nbsp;Le méga peut se déplacer de porte en porte (empreintes mémorisées avant de partir ou découvertes en mission), même sur des mondes différents, dans des univers parallèles, il peut aussi emporter un matos conséquent, plusieurs passagers (1D6), et un véhicule lourd, le méga peut détecter et lire l’empreinte d’une porte à portée moyenne (points de résonnance restants X 10km) et la mémoriser, il peut réparer une porte de transit endommagée en 1D10 jours, et créer une porte de transit individuelle en 2D6 jours.</tr><tr><td ' +
      bkground7 +
      'width="50%">' +
      "<h4><strong>Grade 7.</strong>&nbsp;Le méga peut se déplacer de porte en porte (empreintes mémorisées avant de partir ou découvertes en mission), même sur des mondes différents, dans des univers parallèles, il peut aussi emporter un matos conséquent, plusieurs passagers (2D6), et un véhicule lourd, le méga peut détecter et lire l’empreinte d’une porte à portée longue (points de résonnance restants X 100km) et la mémoriser, il peut réparer une porte de transit endommagée en 1D6 jours, créer une porte de transit individuelle en 1D6 jours, et une porte de transit de groupe en 2D6 jours." +
      "</td><td " +
      bkground8 +
      'width="50%"><h4><strong>Grade 8.</strong>&nbsp;Le méga peut se déplacer de porte en porte (empreintes mémorisées avant de partir ou découvertes en mission), même sur des mondes différents, dans des univers parallèles, il peut aussi emporter un matos conséquent, de nombreux passagers (3D6), et un véhicule lourd, le méga peut détecter et lire l’empreinte d’une porte à portée très longue (points de résonnance restants X 1000km) et la mémoriser, il peut réparer une porte de transit endommagée en 1D6 heures, créer une porte de transit individuelle en 1D10 heures, une porte de transit de groupe en 1D6 jours, et une porte pour véhicule lourd en 2D6 jours.</tr><tr><td ' +
      bkground9 +
      'width="50%">' +
      "<h4><strong>Grade 9.</strong>&nbsp;Le méga peut se déplacer de porte en porte (empreintes mémorisées avant de partir ou découvertes en mission), même sur des mondes différents, dans des univers parallèles, il peut aussi emporter un matos conséquent, de nombreux passagers (4D10), et un véhicule lourd, le méga peut détecter et lire l’empreinte d’une porte à portée planétaire et la mémoriser, il peut réparer une porte de transit endommagée en 1D4 heures, créer une porte de transit individuelle en 1D6 heures, une porte de transit de groupe en 1D10 heures, et une porte pour véhicule lourd en 1D6 jours." +
      "</td><td " +
      bkground10 +
      'width="50%"><h4><strong>Grade 10.</strong>&nbsp;Le méga peut se déplacer de porte en porte (empreintes mémorisées avant de partir ou découvertes en mission), même sur des mondes différents, dans des univers parallèles, il peut aussi emporter un matos conséquent, une foule de passagers (2D30), et deux véhicules lourds, le méga peut détecter et lire l’empreinte d’une porte à portée dans un système solaire et la mémoriser, il peut réparer une porte de transit endommagée en une heure, créer une porte de transit individuelle en 1D4 heures, une porte de transit de groupe en 1D6 heures, et une porte pour véhicule lourd en 1D10 heures.</tr><tr><td ' +
      bkground11 +
      'width="50%">' +
      "<h4><strong>Grade 11.</strong>&nbsp;Le méga peut se déplacer de porte en porte (empreintes mémorisées avant de partir ou découvertes en mission), même sur des mondes différents, dans des univers parallèles, il peut aussi emporter un matos conséquent, une troupe de passagers (2D100), et trois véhicules lourds, le méga peut détecter et lire l’empreinte d’une porte à portée dans un bras galactique et la mémoriser, il peut réparer une porte de transit endommagée en 1D10 minutes, créer une porte de transit individuelle en une heure, une porte de transit de groupe en 1D4 heures, et une porte pour véhicule lourd en 1D6 heures." +
      "</td><td " +
      bkground12 +
      'width="50%"><h4><strong>Grade 12.</strong>&nbsp;Le méga peut se déplacer de porte en porte (empreintes mémorisées avant de partir ou découvertes en mission), même sur des mondes différents, dans des univers parallèles, il peut aussi emporter un matos conséquent, une population de passagers (5D100), et quatre véhicules lourds, le méga peut détecter et lire l’empreinte d’une porte à portée dans une galaxie et la mémoriser, il peut réparer une porte de transit endommagée en 1D6 minutes, créer une porte de transit individuelle en 1D10 minutes, une porte de transit de groupe en une heure, et une porte pour véhicule lourd en 1D4 heures.</td></tr></table>';
    description2 =
      "<h1 style=\"text-align: center;\"><strong>Transit</strong></h1><p>&nbsp;</p><h4>Le Transit permet aux Megas de p&eacute;n&eacute;trer, comme par une porte, dans un grand T&eacute;tra&egrave;dre activ&eacute;, c'est-&agrave;-dire mis en R&eacute;sonance par un Messager, et de ressortir par un autre Point de Transit dont ils ont auparavant m&eacute;moris&eacute; l'empreinte psychique gr&acirc;ce &agrave; un petit T&eacute;tra&egrave;dre appel&eacute; T&eacute;moin.</h4><h4>Un point de Transit n'est donc pas un passage vers un autre point de Transit, mais un &laquo; port &raquo; donnant sur le vaste et obscur oc&eacute;an de l'intercontinuum, sur lequel le Mega doit trouver sa route vers son port de destination.<br />D&egrave;s qu'il passe la surface du T&eacute;tra&egrave;dre, il plonge dans l'intercontinuum obscur. <br />Il peut se diriger vers n'importe quel Point de Transit qu'il a d&eacute;j&agrave; utilis&eacute; ou dont il a m&eacute;moris&eacute; l'empreinte psychique gr&acirc;ce &agrave; un T&eacute;moin (un petit T&eacute;tra&egrave;dre).<br />Il y a rarement plus de 4 T&eacute;moins pour un m&ecirc;me Point de Transit, ils sont donc pr&eacute;cieusement cach&eacute;s et prot&eacute;g&eacute;s l&agrave; o&ugrave; des Megas en auront besoin : le Sanctuaire des Messagers et autres Points de Transit en relation avec celui d'arriv&eacute;e.</h4><h4>Bien que flottant dans l'intercontinuum, le Mega doit visualiser en conscience sa marche vers son point de destination.<br>A l'arriv&eacute;e, le MEGA peut deviner la pr&eacute;sence et les gestes d'autres MEGAs pr&eacute;sents da,s le Point de Transit et voir les alentours du T&eacute;tra&egrave;dre sur un rayon de 10m environ, mais avec un rendu noir et blanc invers&eacute;, &agrave; la fa&ccedil;on d'une radiographie.<div style=\"padding-top: 10px;\">Le temps ext&eacute;rieur est tr&egrave;s ralenti. Il reprend normalement son cours d&egrave;s que le MEGA franchit la surface d'une des faces du T&eacute;tra&egrave;dre.</h4>" +
      '</h4><h3>&nbsp;</h3><h3><strong>Usage</strong></h3>Il existe 12 Grades de Transit.Les MEGAS commencent avec le grade 5.<br>Pour augmenter de Grades, il faut payer en xp*2 (ex&nbsp;: Rang&nbsp;2 = 4XP&nbsp;; Rang 8 = 16XP). <br> Mais pour pouvoir augmenter ces Grades, il faut un minimum de Rang (ou de Rang + Spe Transit (Attention, la spe Transit ne peut pas être supérieur au Rang de Transit)).&nbsp;<br>Minimum de Rang &agrave; disposer pour am&eacute;liorer les Grades&nbsp;:</p><center></center><table style="border-collapse: collapse;box-shadow: -1px 2px 5px 1px rgba(0, 0, 0, 0.7); background: rgb(83,83,201);background: linear-gradient(90deg, rgba(83,83,201,1) 0%, rgba(222,215,59,0.14609593837535018) 0%, rgba(255,255,215,0.10127801120448177) 100%); border-style: solid; width: 202px; margin-left: auto; margin-right: auto;"><td style="width: 93.4062px;"><p style="text-align: center;">Grade</p></td><td><p style="text-align: center;">Rang</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>4</p></td><td style="text-align: center; width: 93.4062px;"><p>2</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>4</p></td><td style="text-align: center; width: 93.4062px;"><p>3</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>6</p></td><td style="text-align: center; width: 93.4062px;"><p>4</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>6</p></td><td style="text-align: center; width: 93.4062px;"><p>5</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>8</p></td><td style="text-align: center; width: 93.4062px;"><p>6</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>8</p></td><td style="text-align: center; width: 93.4062px;"><p>7</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>10</p></td><td style="text-align: center; width: 93.4062px;"><p>8</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>10</p></td><td style="text-align: center; width: 93.4062px;"><p>9</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>12</p></td><td style="text-align: center; width: 93.4062px;"><p>10</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>12</p></td><td style="text-align: center; width: 93.4062px;"><p>11</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>14</p></td><td style="text-align: center; width: 93.4062px;"><p>12</p></td></tr></tbody></table>' +
      '<div style="padding-top:10px; padding-bottom:10px;border: 3px solid #A0A0A0; text-align: left;background-color : rgba(255, 255, 255, 0.4);"><i>&#9755; Test de Transit : Transit.Résonnance.Sens<br /><i>&#9755; Le Transit est d&eacute;sagr&eacute;able et dangereux, et chaque passage consomme 1pt de R&eacute;sonance.<br />&#9755; La Diff normale est de 9.</span></h4></p></div>';

    let tab_1 = new TabbedDialog(
      {
        title: titre,
        header: "",
        footer: "",
        tabs: [
          { title: tab1, content: description1, icon: icon1 },
          { title: tab2, icon: icon2, content: description2 },
        ],
        buttons: {},
        default: "two",
        render: (html) =>
          console.log("Register interactivity in the rendered dialog"),
        close: (html) =>
          console.log(
            "This always is logged no matter which option is chosen"
          ),
      },
      myDialogOptions
    );

    tab_1.render(true);
    break;

  case "TRANSFERT":
    nb_tab = 1;
    tab1 = "Transfert";
    tab2 = "Aide";
    icon1 = "telepathy.svg";
    icon2 = "uncertainty.svg";
    titre = "Pouvoir MEGA . Transfert";
    description1 =
      '<table style="background: transparent;border:none; border-collapse: separate;border-spacing: 15px; "><tr><td ' +
      bkground1 +
      'width="50%"><b>Grade 1.</b>&nbsp;Le méga ne perçoit que la vue de son hôte, durée maximum 1 heure. 		Le méga connait désormais la langue maternelle de son hôte comme si c’était la sienne, et ce à vie. Il n’y a pas de réminiscence. 		La distance maximale entre un méga transféré dans un hôte et son propre corps est égale à son dé de résonnance en mètres.' +
      "</td><td " +
      bkground2 +
      'width="50%"><h4><strong>Grade 2.</strong>&nbsp;Le méga ne perçoit que la vue et le toucher de son hôte, durée maximum 6 heures (avec test de rejet toutes les heures). Le méga connait désormais la langue maternelle de son hôte comme si c’était la sienne, et ce à vie, il découvre le véritable nom de son hôte. Il n’y a pas de réminiscence. La distance maximale entre le méga transféré dans un hôte et son propre corps est égale à son dé de résonnance multiplié par 2 mètres.</tr><tr><td ' +
      bkground3 +
      'width="50%">' +
      "<h4><strong>Grade 3.</strong>&nbsp;Le méga ne perçoit que la vue, le toucher, et l’ouïe de son hôte, durée maximum 1 journée (avec test de rejet toutes les deux heures). Le méga connait désormais la langue maternelle de son hôte comme si c’était la sienne, et ce à vie, il découvre le véritable nom de son hôte, et son lieu de résidence actuel. Il n’y a pas de réminiscence. La distance maximale entre le méga transféré dans un hôte et son propre corps est égale à son dé de résonnance multiplié par 4 mètres." +
      "</td><td " +
      bkground4 +
      'width="50%"><h4><strong>Grade 4.</strong>&nbsp;Le méga perçoit les 5 sens de son hôte, mais avec des perceptions filtrées (simplifiées, déformées), durée maximum illimitée (avec test de rejet tous les jours).Le méga connait désormais la langue maternelle de son hôte comme si c’était la sienne, et ce à vie, il découvre le véritable nom de son hôte, son lieu de résidence actuel, et son but à court terme. Il n’y a pas de réminiscence. La distance maximale entre le méga transféré dans un hôte et son propre corps est égale à son dé de résonnance multiplié par 8 mètres.</tr><tr><td ' +
      bkground5 +
      'width="50%">' +
      "<h4><strong>Grade 5.</strong>&nbsp;Le méga perçoit correctement les 5 sens de son hôte, il a de plus une légère influence sur les gestes de son hôte (pour le retenir ou le pousser dans ses actions), il perçoit aussi grossièrement ses pensées (sentiments et humeurs fortes liées au présent immédiat), mais avec des perceptions filtrées (simplifiées, déformées), durée maximum illimitée (avec test de rejet tous les jours). Le méga connait désormais la langue maternelle de son hôte comme si c’était la sienne, et ce à vie, il découvre le véritable nom de son hôte, son lieu de résidence actuel, et ses buts à court et à long terme. Il n’y a pas de réminiscence. La distance maximale entre le méga transféré dans un hôte et son propre corps est égale à son dé de résonnance multiplié par 10 mètres." +
      "</td><td " +
      bkground6 +
      'width="50%"><h4><strong>Grade 6.</strong>&nbsp;Le méga perçoit correctement les 5 sens de son hôte, il a une légère influence sur les gestes de son hôte (pour le retenir ou le pousser dans ses actions), il perçoit aussi grossièrement ses pensées (sentiments et humeurs fortes liées au présent immédiat), durée maximum illimitée (avec test de rejet tous les 2 jours). Le méga connait désormais la langue maternelle de son hôte comme si c’était la sienne, et ce à vie, il découvre le véritable nom de son hôte, son lieu de résidence actuel, et ses buts à court et à long terme. Il a droit à une réminiscence immédiate. La distance maximale entre le méga transféré dans un hôte et son propre corps est égale à son dé de résonnance multiplié par 20 mètres.</tr><tr><td ' +
      bkground7 +
      'width="50%">' +
      "<h4><strong>Grade 7.</strong>&nbsp;Le méga perçoit correctement les 5 sens de son hôte, il peut prendre le contrôle complet des gestes de son hôte (qui croit avoir eu une absence, avec test de rejet à 6 de malus) durant 1 round + 1 round par avantage au test de transfert, test de rejet à malus de 10 en cas d’action contraire aux principes de l’hôte, durée maximum illimitée (avec test de rejet tous les 3 jours). Le méga connait désormais la langue maternelle de son hôte comme si c’était la sienne, et ce à vie, il découvre le véritable nom de son hôte, son lieu de résidence actuel, et ses buts à court et à long terme. Il a droit à une réminiscence immédiate, et à une dernière au moment du rétrotransfert. La distance maximale entre le méga transféré dans un hôte et son propre corps est égale à son dé de résonnance multiplié par 40 mètres." +
      "</td><td " +
      bkground8 +
      'width="50%"><h4><strong>Grade 8.</strong>&nbsp;Le méga perçoit correctement les 5 sens de son hôte, il peut prendre le contrôle complet des gestes de son hôte (qui croit avoir eu une absence, avec test de rejet à 4 de malus) durant 30 secondes + 30 secondes par avantage au test de transfert, test de rejet à malus de 8 en cas d’action contraire aux principes de l’hôte, durée maximum illimitée (avec test de rejet toutes les semaines). Le méga connait désormais la langue maternelle de son hôte comme si c’était la sienne, et ce à vie, il découvre le véritable nom de son hôte, son lieu de résidence actuel, et ses buts à court et à long terme. Il a droit à une réminiscence immédiate, à une réminiscence par jour et par avantages au jet de transfert, et à une dernière au moment du rétrotransfert. La distance maximale entre le méga transféré dans un hôte et son propre corps est égale à son dé de résonnance multiplié par 60 mètres.</tr><tr><td ' +
      bkground9 +
      'width="50%">' +
      "<h4><strong>Grade 9.</strong>&nbsp;Le méga perçoit correctement les 5 sens de son hôte, il peut prendre le contrôle complet des gestes de son hôte (qui croit avoir eu une absence, avec test de rejet à 2 de malus) durant 1 minute + 1 minute par avantage au test de transfert, test de rejet à malus de 6 en cas d’action contraire aux principes de l’hôte, durée maximum illimitée (avec test de rejet toutes les 2 semaines). Le méga connait désormais la langue maternelle de son hôte comme si c’était la sienne, et ce à vie, il découvre le véritable nom de son hôte, son lieu de résidence actuel, et ses buts à court et à long terme. Il a droit à une réminiscence immédiate, à une réminiscence par heure et par avantages au jet de transfert, et à une dernière au moment du rétrotransfert, avec un bonus de 1. La distance maximale entre le méga transféré dans un hôte et son propre corps est égale à son dé de résonnance multiplié par 80 mètres." +
      "</td><td " +
      bkground10 +
      'width="50%"><h4><strong>Grade 10.</strong>&nbsp;Le méga perçoit correctement les 5 sens de son hôte, il peut prendre le contrôle complet des gestes de son hôte (qui croit avoir eu une absence, avec test de rejet) durant 1 heure + 1 heure par avantage au test de transfert, test de rejet à malus de 4 en cas d’action contraire aux principes de l’hôte, durée maximum illimitée (avec test de rejet toutes les 3 semaines). Le méga connait désormais la langue maternelle de son hôte comme si c’était la sienne, et ce à vie, il découvre le véritable nom de son hôte, son lieu de résidence actuel, et ses buts à court et à long terme. Il a droit à une réminiscence immédiate, à une réminiscence par minute et par avantages au jet de transfert, et à une dernière au moment du rétrotransfert, avec un bonus de 2. La distance maximale entre le méga transféré dans un hôte et son propre corps est égale à son dé de résonnance multiplié par 100 mètres.</tr><tr><td ' +
      bkground11 +
      'width="50%">' +
      "<h4><strong>Grade 11.</strong></h4>&nbsp;Le méga perçoit correctement les 5 sens de son hôte, il peut prendre le contrôle complet des gestes de son hôte (qui n’a aucune sensation d’absence, sa mémoire comblant les trous de façon plausible) durant 1 jour + 1 jour par avantage au test de transfert, test de rejet à malus de 2 en cas d’action contraire aux principes de l’hôte, durée maximum illimitée (avec test de rejet tous les mois). Le méga connait désormais la langue maternelle de son hôte comme si c’était la sienne, et ce à vie, il découvre le véritable nom de son hôte, son lieu de résidence actuel, et ses buts à court et à long terme.Il a droit à une réminiscence immédiate, à une réminiscence par round et par avantages au jet de transfert, et à une dernière au moment du rétrotransfert, avec un bonus de 3.La distance maximale entre le méga transféré dans un hôte et son propre corps est égale à son dé de résonnance multiplié par 500 mètres." +
      "</td><td " +
      bkground12 +
      'width="50%"><h4><strong>Grade 12.</strong>&nbsp;Le méga perçoit correctement les 5 sens de son hôte, il peut prendre le contrôle complet des gestes de son hôte (qui n’a aucune sensation d’absence, sa mémoire comblant les trous de façon plausible) autant de temps qu’il veut, et peut même faire des actions contraires aux principes de l’hôte, durée maximum illimitée (avec test de rejet tous les ans). Le méga connait désormais la langue maternelle de son hôte comme si c’était la sienne, et ce à vie, il découvre le véritable nom de son hôte, son lieu de résidence actuel, et ses buts à court et à long terme. Il a droit à une réminiscence immédiate, à une réminiscence par round et par avantages au jet de transfert, et à une dernière au moment du rétrotransfert, avec un bonus de 4. La distance maximale entre le méga transféré dans un hôte et son propre corps est égale à son dé de résonnance en kilomètres.</h4></td></tr></table>';
    description2 =
      "<h1 style=\"text-align: center;\"><strong>Transfert</strong></h1><p>&nbsp;</p><h4>Le Transfert est l'autre pouvoir particulier des Megas, qui leur permet de superposer leur esprit sur celui d'un &ecirc;tre pensant. Certains Megas refusent de l'utiliser, malgr&eacute; les codes d&eacute;ontologiques qui l'encadrent.</h4><h4>Le Mega, apr&egrave;s avoir &laquo; accroch&eacute; &raquo; sa cible, tombe en catalepsie, et une partie de son esprit (sur le mod&egrave;le du corps astral) investit le corps de son &laquo; h&ocirc;te &raquo;.<br />Selon les grades de son Talent de Transfert, le Mega peut obtenir divers degr&eacute;s de contr&ocirc;le de son h&ocirc;te.<br />Le Mega doit pouvoir se syntoniser c'est-&agrave;-dire avoir un visuel net et direct avec :</h4><ul><li><h4>son regard et/ou autre mode d'expression (visage, parole) ;</h4></li><li><h4>une attitude corporelle identifiable ;</h4></li><li><h4>le type d'action qu'elle est en train d'accomplir (ou s'appr&ecirc;te juste &agrave;...), pour &eacute;viter un accident.</h4></li></ul><h4>Voir &agrave; travers un syst&egrave;me optique passif (lunettes, jumelles, miroir) est consid&eacute;r&eacute; comme un visuel en direct. Tout syst&egrave;me &agrave; transformation de signal (analogique ou digital) ne fonctionne pas.</h4>" +
      '</h4><h3>&nbsp;</h3><h3><strong>Usage</strong></h3>Il existe 12 Grades de Transfert.Les MEGAS commencent avec le Grade 2.<br>Pour augmenter de Grades, il faut payer en xp*2 (ex&nbsp;: Rang&nbsp;2 = 4XP&nbsp;; Rang 8 = 16XP). Mais pour pouvoir augmenter ces Grades, il faut un minimum de Rang.&nbsp;<br>Minimum de Rang &agrave; disposer pour am&eacute;liorer les Grades&nbsp;:</p><center></center><table style="border-collapse: collapse;box-shadow: -1px 2px 5px 1px rgba(0, 0, 0, 0.7); background: rgb(83,83,201);background: linear-gradient(90deg, rgba(83,83,201,1) 0%, rgba(222,215,59,0.14609593837535018) 0%, rgba(255,255,215,0.10127801120448177) 100%); border-style: solid; width: 202px; margin-left: auto; margin-right: auto;" border="1" width="330" cellspacing="0" cellpadding="0"><tbody><tr><td style="width: 102.594px;"><p style="text-align: center;">Rang</p></td><td style="width: 93.4062px;"><p style="text-align: center;">Grade</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>4</p></td><td style="text-align: center; width: 93.4062px;"><p>2</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>4</p></td><td style="text-align: center; width: 93.4062px;"><p>3</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>6</p></td><td style="text-align: center; width: 93.4062px;"><p>4</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>6</p></td><td style="text-align: center; width: 93.4062px;"><p>5</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>8</p></td><td style="text-align: center; width: 93.4062px;"><p>6</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>8</p></td><td style="text-align: center; width: 93.4062px;"><p>7</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>10</p></td><td style="text-align: center; width: 93.4062px;"><p>8</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>10</p></td><td style="text-align: center; width: 93.4062px;"><p>9</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>12</p></td><td style="text-align: center; width: 93.4062px;"><p>10</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>12</p></td><td style="text-align: center; width: 93.4062px;"><p>11</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>14</p></td><td style="text-align: center; width: 93.4062px;"><p>12</p></td></tr></tbody></table>' +
      "<div style=\"padding-top:10px; padding-bottom:10px;border: 3px solid #A0A0A0; text-align: left;background-color : rgba(255, 255, 255, 0.4);\"><i><h4><strong>Test de Transfert</strong></h4><h4>Le Test de Transfert est une Opposition entre la capacit&eacute; actuelle du Mega au Transfert et la capacit&eacute; de Rejet de la cible.</h4><h4><strong>&#9755; Pour le Mega :</strong></h4><h4>Test de Transfert = Transfert (+Sp&eacute;)&bull;R&eacute;sonance&bull;Caract&egrave;re</h4><h4><strong>&#9755; Pour la cible :</strong></h4><h4>Test de Rejet = Interpr&eacute;ter&bull;Sens&bull;Caract&egrave;re</h4><h4><strong>&#9755; &nbsp;R&eacute;sultat :</strong></h4><h4>Chaque Av optimise la qualit&eacute; et l'efficacit&eacute; du Transfert.</h4></li></ul><h4>Un &Eacute;chec implique que le Transfert n'a pas eu lieu. Mais un &Eacute;chec significatif ou grave peut avoir alert&eacute; la cible et la rendre hostile au Mega, qu'elle ait compris ou non ce qui s'est pass&eacute;, entra&icirc;nant un malus pour un autre essai.</h4></div></i><h4><strong>H&ocirc;te volontaire</strong></h4><h4>Le Niveau de Rejet de la cible peut diminuer de 2 ou 4Rg si sa vigilance est faible (fatigue, drogue), voire 6Rg ou plus si elle est volontaire pour &ecirc;tre &laquo; investie &raquo;. C'est le cas des Contacts entra&icirc;n&eacute;s dans ce but ou des personnes cherchant &agrave; &ecirc;tre &laquo; chevauch&eacute;es &raquo; par un esprit au cours d'une transe.</h4><h4><strong>R&eacute;trotransfert normal</strong></h4><h4>Les conditions d'un retour de Transfert id&eacute;al sont identiques &agrave; celles du Transfert, &agrave; ceci pr&egrave;s que c'est le corps en catalepsie du Mega qui doit &ecirc;tre clairement vu par l'h&ocirc;te. Ce qui signifie que ce dernier peut aussi voir le Mega, qui, sortant de sa l&eacute;thargie, n'est pas forc&eacute;ment &agrave; son avantage (affal&eacute;, hagard...).</h4><h4>Si le Mega r&eacute;ussit son Test de Transfert, l'h&ocirc;te n'a aucune sensation d'avoir &eacute;t&eacute; contr&ocirc;l&eacute; ou m&ecirc;me juste investi (&agrave; condition de ne pas avoir accompli des actes contraires &agrave; sa personnalit&eacute;)</h4><h4>Un Test de R&eacute;trotransfert rat&eacute; ou diverses circonstances g&ecirc;nantes conduisent aux cas des R&eacute;trotransferts probl&eacute;matiques.</h4><h4><strong>R&eacute;trotranferts probl&eacute;matiques</strong></h4><h4><strong>Corps hors de vue, trop &eacute;loign&eacute;</strong></h4><h4>Ne pas &laquo; se &raquo; voir implique un malus de 4Rg, qui peut augmenter si l'h&ocirc;te est parti loin du corps du Mega.<br />M&ecirc;me si le Mega ne sait plus comment r&eacute;int&eacute;grer son corps physique, son corps astral y reste rattach&eacute; par un lien imperceptible (d&eacute;tectable seulement par un excellent R&eacute;sonant dou&eacute; de Nexus). Si le corps du Mega est d&eacute;truit, alors le corps astral en Transfert l'est aussi.</h4><h4><strong>R&eacute;trotransfert rat&eacute;</strong></h4><h4>Le Mega reste prisonnier de l'h&ocirc;te. Il doit alors se couper des sens de l'h&ocirc;te pour r&eacute;cup&eacute;rer ses points de R&eacute;sonance et retenter un R&eacute;trotransfert.</h4><h4><strong>Rejet</strong></h4><h4>Au bout d'une heure de Transfert, ou moins si le manque de discr&eacute;tion ou l'interventionnisme du PJ irritent la personnalit&eacute; de l'h&ocirc;te, le MJ peut demander un nouveau Test de Transfert. En cas de r&eacute;ussite, le Transfert est maintenu. En cas d'&eacute;chec avec 0 D&eacute;sAv et si le corps du Mega est en vue, ce dernier le r&eacute;int&egrave;gre violemment. L'h&ocirc;te est alert&eacute;. En cas d'&eacute;chec avec I D&eacute;sAv ou plus, le Mega reste dans l'h&ocirc;te mais il perd le contact avec les sens de ce dernier. II se retrouve dans le noir et le silence pour D&eacute;sAv x5mn, il perd 2Rg de R&eacute;sonance par D&eacute;sAv. L'h&ocirc;te est alert&eacute;. Le Mega &laquo; prisonnier &raquo; peut se couper volontairement des sens de l'h&ocirc;te pour r&eacute;cup&eacute;rer ses points de R&eacute;sonance et retenter un R&eacute;trotransfert.</h4>";

    let tab_2 = new TabbedDialog(
      {
        title: titre,
        header: "",
        footer: "",
        tabs: [
          { title: tab1, content: description1, icon: icon1 },
          { title: tab2, icon: icon2, content: description2 },
        ],
        buttons: {},
        default: "two",
        render: (html) =>
          console.log("Register interactivity in the rendered dialog"),
        close: (html) =>
          console.log(
            "This always is logged no matter which option is chosen"
          ),
      },
      myDialogOptions
    );

    tab_2.render(true);
    break;

  default:
    switch (type_pouvoir) {
      case "info_pouvoir_psi_1":
        let numItem = this.actor.system.pouvoirs.pouvoir_psi_1.num_item;
        nb_tab = 4;
        tab1 = "VIVANT & CHAKRAS";
        tab2 = "Equilibre mental et soins physiques";
        tab3 = "Monde intérieur et accumulation de Vibration";
        tab4 = "Aide";
        icon1 = "defibrilate.svg";
        icon2 = "healing.svg";
        icon3 = "embrassed-energy.svg";
        icon4 = "uncertainty.svg";
        titre = "Vivant . Chakras";
        description1 = itemsPouvoir[numItem].system.description;
        description2 =
          "<h4>Percevoir les flux et &eacute;nergies qui circulent dans et entre les &ecirc;tres vivants et agir dessus, en principe pour les &eacute;quilibrer, mais parfois pour les d&eacute;t&eacute;riorer.<br>" +
          '<table style="background: transparent;border:none; border-collapse: separate;border-spacing: 15px; "><tr><td ' +
          bkground1 +
          'width="50%"><b>Grade 1.</b>&nbsp;</strong></h4><h4>Apaiser/inqui&eacute;ter un &ecirc;tre ; sentir les flux et les dissonances du patient, influer sur sa fatigue ou sa pathologie.</h4>' +
          "</td><td " +
          bkground2 +
          'width="50%"><h4><strong>Grade 2.</strong></h4><h4>Atténuer/renforcer les phobies et addictions (des autres), détection des zones de Vibration plus chaudes/Froides à proximité ; accélérer/ralentir les effets des maladies et empoisonnements ou ceux des soins apportés par un soignant, soi y compris.</h4></tr><tr><td ' +
          bkground3 +
          'width="50%">' +
          "<h4><strong>Grade 3.</strong></h4><h4>Perception des sensations et humeurs des animaux ; soins simples des végétaux.</h4>" +
          "</td><td " +
          bkground4 +
          'width="50%"><h4><strong>Grade 4.</strong></h4><h4>Mettre en confiance, aider à trouver à retrouver un souvenir perdu ; effet de guérison équivalent à des Soins simples par un soignant, soi y compris.</h4></tr><tr><td ' +
          bkground5 +
          'width="50%">' +
          "<h4><strong>Grade 5.</strong></h4><h4>Détecter les Résonnants et Vibrants latents qui s'ignorent, les Megas latents, les Megas et les Nomegs ; Médications et poisons : voir tout de suite si une substance est plus bénéfique que néfaste.</h4>" +
          "</td><td " +
          bkground6 +
          "width=\"50%\"><h4><strong>Grade 6.</strong></h4><h4>Endormir profondément la cible, surtout si elle est d'accord ; trouver et apprivoiser un animal dont les chakras complètent ceux de la cible, qui gagne 2Rg en Résonnance tant que l'animal reste dans les parages.</h4></tr><tr><td " +
          bkground7 +
          'width="50%">' +
          "<h4><strong>Grade 7.</strong></h4><h4>Eliminer un blocage profond des chakras et libérer la personnalité du patient ; Corps sain : divise par 2 le temps de récupération des points de Traits de Corps consommés ou perdus.</h4>" +
          "</td><td " +
          bkground8 +
          "width=\"50%\"><h4><strong>Grade 8.</strong></h4><h4>Esprit sain : divise par 2 le temps de récupération de points de Trait d'Esprit consommés ou perdus ; Transfusion : permet de prendre des points de vie d'un donneur (autant qu'il le souhaite) et les transmettre à la cible.</h4></tr><tr><td " +
          bkground9 +
          'width="50%">' +
          "<h4><strong>Grade 9.</strong></h4><h4>Trait fort : l'un des Traits de la cible (ou de soi-même) est augmentée de 2Rg pendant [Av]+1h.</h4>" +
          "</td><td " +
          bkground10 +
          'width="50%"><h4><strong>Grade 10.</strong></h4><h4>En une nuit passée sous le même toit, le Résonnant a pris sur lui la maladie psychosomatique de sa cible.</h4></tr><tr><td ' +
          bkground11 +
          'width="50%">' +
          "<h4><strong>Grade 11.</strong></h4><h4>Booster/vampiriser l'Ardence : le Résonnant peut donner des points de sa jauge d'Ardence à un autre personnage qui les gardera en plus des siens jusqu'à utilisation Il peut aussi en voler à une cible à raison de 1pt par Av.</h4>" +
          "</td><td " +
          bkground12 +
          'width="50%"><h4><strong>Grade 12.</strong></h4><h4>Booster/vampiriser la Résonnance : le Résonnant peut donner des points de sa jauge de Résonnance à un autre personnage qui les gardera en plus des siens jusqu\'à utilisation. Il peut aussi en voler à une cible à raison de 1pt par Av.</h4></td></tr></table>';
        description3 =
          "<h4>Le flux et les couleurs des chakras dessinnent un pays intérieur où le Résonnant peut cacher ses ressources.<br>" +
          '<table style="background: transparent;border:none; border-collapse: separate;border-spacing: 15px; "><tr><td ' +
          bkground1 +
          'width="50%"><b>Grade 1.&nbsp;</b></h4><h4>Réserve de Vibration : gain de [Av]+1pt de Résonnance éphémère (pas de nouvel essai avant de les avoir tous consommés).</h4>' +
          "</td><td " +
          bkground2 +
          'width="50%"><h4><strong>Grade 2.</strong></h4><h4>Jardin intérieur : le personnage y revoit son passé proche avec une nouvelle chance de percuter sur un indice négligé ou une déduction ratée.</h4></tr><tr><td ' +
          bkground3 +
          'width="50%">' +
          '<h4><strong>Grade 3.</strong></h4><h4>Le personnage sent, un peu avant d\'y entrer, les zones "néfastes" et peut choisir un chemin plus sûr.</h4>' +
          "</td><td " +
          bkground4 +
          'width="50%"><h4><strong>Grade 4.</strong></h4><h4>Réserve de Vibration : gain de [Av+1]x2pt de Résonnance éphémère, pour soi ou pour un patient.</h4></tr><tr><td ' +
          bkground5 +
          'width="50%">' +
          "<h4><strong>Grade 5.</strong></h4><h4>En concentrant ses chakras dans une main, le personnage peut interdire le passage à un individu, sans que ce geste semble agressif.</h4>" +
          "</td><td " +
          bkground6 +
          'width="50%"><h4><strong>Grade 6.</strong></h4><h4>Revivre une scène du passé imprimée dans le sol ou les murs d\'un bâtiment.</h4></tr><tr><td ' +
          bkground7 +
          'width="50%">' +
          "<h4><strong>Grade 7.</strong></h4><h4>Echo de Résonance : divise par 2 le temps de récupération de points de Résonance consomés ou perdus.</h4>" +
          "</td><td " +
          bkground2 +
          'width="50%"><h4><strong>Grade 8.</strong></h4><h4>En extériorisant une partie des flux, les chakras agissent comme une armure (bonus DEF=Av+1).</h4></tr><tr><td ' +
          bkground9 +
          'width="50%">' +
          "<h4><strong>Grade 9.</strong></h4><h4>Inviter et abriter, dans son Jardin intérieur, une Présence d'esprit qui disparaît du monde extérieur.</h4>" +
          "</td><td " +
          bkground10 +
          "width=\"50%\"><h4><strong>Grade 10.</strong></h4><h4>Réserve d'Ardence : gain de [Av]x2pt d'Ardence éphémère, pour soi ou un patient.</h4></tr><tr><td " +
          bkground11 +
          'width="50%">' +
          "<h4><strong>Grade 11.</strong></h4><h4>Interroger des ancêtres, dont le caractère et certains souvenirs restent accessibles au fond des chakras d'un être vivant actuel.</h4>" +
          "</td><td " +
          bkground12 +
          "width=\"50%\"><h4><strong>Grade 12.</strong></h4><h4>Emprisonner dans son Jardin intérieur une Présence d'esprit ou une entité mineure. Le risque est grand mais offre un gain de Résonnance (+2 à +4Rg) et parfois d'Ardence (+2Rg).</h4></td></tr></table>";
        description4 =
          "<h3><strong>Univers Froids, univers Chauds</strong></h3><h4>Ce qu'il vous faut savoir est qu'il existe des univers qualifi&eacute;s de &laquo; Froids &raquo; : les lois physiques y sont rigides et la relation de cause &agrave; effet, base de la science, est pr&eacute;sente partout &agrave; travers l'espace-temps. Et d'autres univers o&ugrave; les r&egrave;gles de la physique s'assouplissent. On parle alors d'univers &laquo; Fluide &raquo; ou Chaud &raquo;, o&ugrave; il est possible, ponctuellement, de d&eacute;former ces lois. C'est ce que beaucoup appellent sortil&egrave;ges ou&nbsp; superpouvoirs - utilis&eacute;s par des mages, des m&eacute;diums et des super-h&eacute;ros - et que les rares sp&eacute;cialistes nomment &laquo; effets de vibration &raquo; ou de &laquo;&nbsp; r&eacute;sonance &raquo;, r&eacute;alis&eacute;s par des Vibrants ou des R&eacute;sonants.<br />Les machines et la technologie ont besoin, pour leur fonctionnement, que les lois d'un univers soient stables et Froides et ne font pas bon m&eacute;nage avec les univers Chauds, plus fluctuants. &Agrave; l'inverse, la &laquo; magie &raquo; aura beaucoup de mal &agrave; s'exprimer dans des continuums rigides et ne s'&eacute;panouira que dans les environnements Fluides et donc Chauds.<p></p>" +
          '</h4><h3>&nbsp;</h3><h3><strong>Utiliser les pouvoirs</strong></h3>Il existe 12 grades de pouvoir psi (r&eacute;sonnance).Les MEGAS commencent avec le grade 1.<br>Pour augmenter de grades, il faut payer en xp*2 (ex&nbsp;: Rang&nbsp;2 = 4XP&nbsp;; Rang 8 = 16XP). Mais pour pouvoir augmenter ces grades, il faut un minimum de rang.&nbsp;<br>Minimum de Rang &agrave; disposer pour am&eacute;liorer les grades&nbsp;:</p><center></center><table style="border-style: solid; width: 202px; margin-left: auto; margin-right: auto;" border="1" width="330" cellspacing="0" cellpadding="0"><tbody><tr><td style="width: 102.594px;"><p style="text-align: center;">Rang</p></td><td style="width: 93.4062px;"><p style="text-align: center;">Grade</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>4</p></td><td style="text-align: center; width: 93.4062px;"><p>2</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>4</p></td><td style="text-align: center; width: 93.4062px;"><p>3</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>6</p></td><td style="text-align: center; width: 93.4062px;"><p>4</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>6</p></td><td style="text-align: center; width: 93.4062px;"><p>5</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>8</p></td><td style="text-align: center; width: 93.4062px;"><p>6</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>8</p></td><td style="text-align: center; width: 93.4062px;"><p>7</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>10</p></td><td style="text-align: center; width: 93.4062px;"><p>8</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>10</p></td><td style="text-align: center; width: 93.4062px;"><p>9</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>12</p></td><td style="text-align: center; width: 93.4062px;"><p>10</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>12</p></td><td style="text-align: center; width: 93.4062px;"><p>11</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>14</p></td><td style="text-align: center; width: 93.4062px;"><p>12</p></td></tr></tbody></table>' +
          "<p><center><div style=\"width:60%; padding-top:10px; padding-bottom:10px;border: 3px solid #A0A0A0; text-align: left;background-color : rgba(255, 255, 255, 0.4);\"><i>&#9755; <b>La Difficult&eacute; est &eacute;gale &agrave; la somme :</b></p><p>- Du grade du pouvoir (ou des pouvoirs) utilis&eacute;(s)</p><p>- Du niveau total d&ucirc; &agrave; l'envergure du pouvoir utilis&eacute; : aire d'effet, distance, dur&eacute;e, ampleur de l'effet</p><i>&#9755; <b>Test de Pouvoir :</b> Talent (+Sp&eacute;).Psi.R&eacute;sonance (+bonus-malus d&ucirc; &agrave; la chaleur/froid de l'endroit)</div>";
        break;

      case "TÉLÉPATHIE":
        nb_tab = 5;
        tab1 = "RELATIONS & TÉLÉPATHIE";
        tab2 = "Communication Télépathique";
        tab3 =
          "Percevoir présences, sentiments, pensées, anticiper une conduite";
        tab4 = "Influencer, illusion, paraître, ascendant";
        tab5 = "Aide";
        icon1 = "backup.svg";
        icon2 = "telepathy.svg";
        icon3 = "rear-aura.svg";
        icon4 = "convince.svg";
        icon5 = "uncertainty.svg";
        titre = "Relations . Télépathie";
        description1 =
          "<h3><strong>Sph&egrave;re des Relations &amp; T&eacute;l&eacute;pathie</strong></h3><h4>Les rapports avec et entre les autres individus sont au c&oelig;ur des attentions du Mega, qui lorsqu'il est seul, ressent le besoin d'enrichir par tous les moyens sa culture dans ce domaine. Le Pouvoir li&eacute; est la <strong>T&eacute;l&eacute;pathie</strong> et les multiples d&eacute;clinaisons que le Mega peut inventer, lui permettant d'anticiper l'action d'un individu ou d'influencer sa perception du Mega : inqui&eacute;tant, rassurant ou insignifiant. Quand ce Pouvoir est combin&eacute; au bon Talent, le Mega peut tenter des bluffs assez t&eacute;m&eacute;raires.&nbsp;<br>Le fait d'&ecirc;tre t&eacute;l&eacute;pathe induit petit &agrave; petit une forme de responsabilit&eacute; &agrave; l'&eacute;gard du groupe (Megas et autres membres), car le fait de penser &agrave; se mettre &agrave; l'&eacute;coute d'un non-t&eacute;l&eacute;pathe absent depuis trop longtemps est souvent le seul moyen de savoir qu'il est en danger...</h4><center><img src='systems/mega/images/thelepathie.png'></center>";
        description2 =
          "<h4>Le personnage peut communiquer avec des personnes non télépathes, familières ou vaguement connues. La communication entre télépathes est plus aisée (Diff-2). La communication avec des inconnus est plus difficile (Diff+2).<br>" +
          '<table style="background: transparent;border:none; border-collapse: separate;border-spacing: 15px; "><tr><td ' +
          bkground1 +
          'width="50%"><b>Grade 1.</b>&nbsp;</h4><h4>Echanges avec des individus familiers, déjà &agrave; "l\'&eacute;coute", de symboles simples qui peuvent &ecirc;tre re&ccedil;us et mal interpr&eacute;t&eacute;s (un ours pour un loup).</h4>' +
          "</td><td " +
          bkground2 +
          'width="50%"><h4><strong>Grade 2.</strong></h4><h4>Idem avec des symboles plus d&eacute;taill&eacute;s ou pr&eacute;cis.</h4></td></tr><tr><td ' +
          bkground3 +
          'width="50%">' +
          "<h4><strong>Grade 3.</strong></h4><h4>Envoi d'un message simple vers un seul des 5 sens.</h4>" +
          "</td><td " +
          bkground4 +
          'width="50%"><h4><strong>Grade 4.</strong></h4><h4>Envoi de messages simultan&eacute;s plus complexes : phrase, images fixes et sons, etc...</h4></td></tr><tr><td ' +
          bkground5 +
          'width="50%">' +
          "<h4><strong>Grade 5.</strong></h4><h4>T&eacute;l&eacute;pathie courante avec personnes famili&egrave;res. Contact possible avec des inconnus rep&eacute;r&eacute;s par d'autres moyens.</h4>" +
          "</td><td " +
          bkground6 +
          'width="50%"><h4><strong>Grade 6.</strong></h4><h4>Echanges simultan&eacute;s identiques avec deux personnes.</h4></td></tr><tr><td ' +
          bkground7 +
          'width="50%">' +
          "<h4><strong>Grade 7.</strong></h4><h4>Echanges simultan&eacute;s identiques avec trois personnes.</h4>" +
          "</td><td " +
          bkground8 +
          'width="50%"><h4><strong>Grade 8.</strong></h4><h4>Echanges cloisonn&eacute;s ou ouverts entre les membres d\'un petit groupe connu.</h4></td></tr><tr><td ' +
          bkground9 +
          'width="50%">' +
          "<h4><strong>Grade 9.</strong></h4><h4>Echanges cloisonn&eacute;s ou ouverts entre les membres d'un large groupe connu.</h4>" +
          "</td><td " +
          bkground10 +
          'width="50%"><h4><strong>Grade 10.</strong></h4><h4>Idem que Grade 9, tout en faisant d\'autres activit&eacute;s sans malus.</h4></td></tr><tr><td ' +
          bkground11 +
          'width="50%">' +
          "<h4><strong>Grade 11.</strong></h4><h4>Ecoute ouverte sur les &eacute;changes entre t&eacute;l&eacute;pathes m&ecirc;me inconnus.</h4>" +
          "</td><td " +
          bkground12 +
          'width="50%"><h4><strong>Grade 12.</strong></h4><h4>Contacter un Nautonier.</h4></td></tr></table>';
        description3 =
          "<h4>Perception de présences, de pensées ou d'intentions.<br>" +
          '<table style="background: transparent;border:none; border-collapse: separate;border-spacing: 15px; "><tr><td ' +
          bkground1 +
          'width="50%"><b>Grade 1.&nbsp;</b></h4><h4>Sentir la pr&eacute;sence d\'un &ecirc;tre pensant, m&ecirc;me un animal.</h4>' +
          "</td><td " +
          bkground2 +
          'width="50%"><h4><strong>Grade 2.</strong></h4><h4>Sentir la pr&eacute;sence d\'une pens&eacute;e &eacute;volu&eacute;e.</h4></td></tr><tr><td ' +
          bkground3 +
          'width="50%">' +
          "<h4><strong>Grade 3.</strong></h4><h4>Sentir des pensées évoluées et distinguer soit leur nombre, soit leur sentiment dominant.</h4>" +
          "</td><td " +
          bkground4 +
          'width="50%"><h4><strong>Grade 4.</strong></h4><h4>Sentir des pensées évoluées et en localiser certaines.</h4></td></tr><tr><td ' +
          bkground5 +
          'width="50%">' +
          "<h4><strong>Grade 5.</strong></h4><h4>Sentir des intentions peu avant leur execution (gain d'initiative).</h4>" +
          "</td><td " +
          bkground6 +
          'width="50%"><h4><strong>Grade 6.</strong></h4><h4>Idem Grade 5 et capter des bribes de réflexions intelligibles de l\'une des pensées repérées.</h4></td></tr><tr><td ' +
          bkground7 +
          'width="50%">' +
          "<h4><strong>Grade 7.</strong></h4><h4>Idem Grade 6, sur deux pensées simultanément.</h4>" +
          "</td><td " +
          bkground8 +
          'width="50%"><h4><strong>Grade 8.</strong></h4><h4>Idem sur un petit groupe.</h4></td></tr><tr><td ' +
          bkground9 +
          'width="50%">' +
          "<h4><strong>Grade 9.</strong></h4><h4>Possibilité de voir la scène à partir de bribes de ce que voit chaque témoin.</h4>" +
          "</td><td " +
          bkground10 +
          'width="50%"><h4><strong>Grade 10.</strong></h4><h4>Idem Grade 9, plus sentir les Présences d\'esprits et les entités.</h4></td></tr><tr><td ' +
          bkground11 +
          'width="50%">' +
          "<h4><strong>Grade 11.</strong></h4><h4>Dialoguer avec les présences d'esprits.</h4>" +
          "</td><td " +
          bkground12 +
          'width="50%"><h4><strong>Grade 12.</strong></h4><h4>Sentir l\'humeur des entités.</h4></td></tr></table>';
        description4 =
          "<h4>L'influence doit être subtile, sous peine d'éveiller la méfiance de la cible.<br>" +
          '<table style="background: transparent;border:none; border-collapse: separate;border-spacing: 15px; "><tr><td ' +
          bkground1 +
          'width="50%"><b>Grade 1.&nbsp;</b></h4><h4>Para&icirc;tre l&eacute;g&egrave;rement diff&eacute;rent aux yeux d\'un t&eacute;moin.</h4>' +
          "</td><td " +
          bkground2 +
          'width="50%"><h4><strong>Grade 2.</strong></h4><h4>Brouiller-tromper les sens d\'un t&eacute;moin sur un &eacute;l&eacute;ment du d&eacute;cor.</h4/td></tr><tr><td ' +
          bkground3 +
          'width="50%">' +
          "<h4><strong>Grade 3.</strong></h4><h4>Idem Grade 2, sur plusieurs éléments du décor, insuffler un sentiment diffus simple (rassurer, inquiéter) à un être visible ou repéré.</h4>" +
          "</td><td " +
          bkground4 +
          'width="50%"><h4><strong>Grade 4.</strong></h4><h4>Donner une apparence trompeuse à une cible. Insuffler un sentiment précis à un individu. Illusion sur une partie du décor pour un petit groupe.</h4></td></tr><tr><td ' +
          bkground5 +
          'width="50%">' +
          "<h4><strong>Grade 5.</strong></h4><h4>Insuffler un sentiment précis à un petit groupe. Envoyer des images dans les rêves d'une personne connue.</h4>" +
          "</td><td " +
          bkground6 +
          'width="50%"><h4><strong>Grade 6.</strong></h4><h4>Apparence trompeuse et insuffler un sentiment précis à un groupe, prise d\'ascendant.</h4></td></tr><tr><td ' +
          bkground7 +
          'width="50%">' +
          "<h4><strong>Grade 7.</strong></h4><h4>Insuffler une idée construite à un individu, conscient ou en train de rêver.</h4>" +
          "</td><td " +
          bkground8 +
          "width=\"50%\"><h4><strong>Grade 8.</strong></h4><h4>Idem Grade 6 mais avec illusion complexe ou mobile sur un temps court (minutes), comme l'arrivée illusoire d'un groupe d'individus.</h4></td></tr><tr><td " +
          bkground9 +
          'width="50%">' +
          "<h4><strong>Grade 9.</strong></h4><h4>Idem Grade 8, mais l'illusion dure tant que le personnage l'alimente.</h4>" +
          "</td><td " +
          bkground10 +
          'width="50%"><h4><strong>Grade 10.</strong></h4><h4>Idem Grade 9, mais l\'illusion peut durer quelques instants après le départ du Résonnant (si plausible).</h4></td></tr><tr><td ' +
          bkground11 +
          'width="50%">' +
          "<h4><strong>Grade 11.</strong></h4><h4>Idem Grade 10, mais sur un vaste décor et une foule.</h4>" +
          "</td><td " +
          bkground12 +
          'width="50%"><h4><strong>Grade 12.</strong></h4><h4>Créer un environnement fictif pour un large groupe qui croit faussement y agir.</h4></td></tr></table>';
        description5 =
          "<h3><strong>Univers Froids, univers Chauds</strong></h3><h4>Ce qu'il vous faut savoir est qu'il existe des univers qualifi&eacute;s de &laquo; Froids &raquo; : les lois physiques y sont rigides et la relation de cause &agrave; effet, base de la science, est pr&eacute;sente partout &agrave; travers l'espace-temps. Et d'autres univers o&ugrave; les r&egrave;gles de la physique s'assouplissent. On parle alors d'univers &laquo; Fluide &raquo; ou Chaud &raquo;, o&ugrave; il est possible, ponctuellement, de d&eacute;former ces lois. C'est ce que beaucoup appellent sortil&egrave;ges ou&nbsp; superpouvoirs - utilis&eacute;s par des mages, des m&eacute;diums et des super-h&eacute;ros - et que les rares sp&eacute;cialistes nomment &laquo; effets de vibration &raquo; ou de &laquo;&nbsp; r&eacute;sonance &raquo;, r&eacute;alis&eacute;s par des Vibrants ou des R&eacute;sonants.<br />Les machines et la technologie ont besoin, pour leur fonctionnement, que les lois d'un univers soient stables et Froides et ne font pas bon m&eacute;nage avec les univers Chauds, plus fluctuants. &Agrave; l'inverse, la &laquo; magie &raquo; aura beaucoup de mal &agrave; s'exprimer dans des continuums rigides et ne s'&eacute;panouira que dans les environnements Fluides et donc Chauds.<p></p>" +
          '</h4><h3>&nbsp;</h3><h3><strong>Utiliser les pouvoirs</strong></h3>Il existe 12 grades de pouvoir psi (r&eacute;sonnance).Les MEGAS commencent avec le grade 1.<br>Pour augmenter de grades, il faut payer en xp*2 (ex&nbsp;: Rang&nbsp;2 = 4XP&nbsp;; Rang 8 = 16XP). Mais pour pouvoir augmenter ces grades, il faut un minimum de rang.&nbsp;<br>Minimum de Rang &agrave; disposer pour am&eacute;liorer les grades&nbsp;:</p><center></center><table style="border-style: solid; width: 202px; margin-left: auto; margin-right: auto;" border="1" width="330" cellspacing="0" cellpadding="0"><tbody><tr><td style="width: 102.594px;"><p style="text-align: center;">Rang</p></td><td style="width: 93.4062px;"><p style="text-align: center;">Grade</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>4</p></td><td style="text-align: center; width: 93.4062px;"><p>2</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>4</p></td><td style="text-align: center; width: 93.4062px;"><p>3</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>6</p></td><td style="text-align: center; width: 93.4062px;"><p>4</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>6</p></td><td style="text-align: center; width: 93.4062px;"><p>5</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>8</p></td><td style="text-align: center; width: 93.4062px;"><p>6</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>8</p></td><td style="text-align: center; width: 93.4062px;"><p>7</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>10</p></td><td style="text-align: center; width: 93.4062px;"><p>8</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>10</p></td><td style="text-align: center; width: 93.4062px;"><p>9</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>12</p></td><td style="text-align: center; width: 93.4062px;"><p>10</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>12</p></td><td style="text-align: center; width: 93.4062px;"><p>11</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>14</p></td><td style="text-align: center; width: 93.4062px;"><p>12</p></td></tr></tbody></table>' +
          "<p><center><div style=\"width:60%; padding-top:10px; padding-bottom:10px;border: 3px solid #A0A0A0; text-align: left;background-color : rgba(255, 255, 255, 0.4);\"><i>&#9755; <b>La Difficult&eacute; est &eacute;gale &agrave; la somme :</b></p><p>- Du grade du pouvoir (ou des pouvoirs) utilis&eacute;(s)</p><p>- Du niveau total d&ucirc; &agrave; l'envergure du pouvoir utilis&eacute; : aire d'effet, distance, dur&eacute;e, ampleur de l'effet</p><i>&#9755; <b>Test de Pouvoir :</b> Talent (+Sp&eacute;).Psi.R&eacute;sonance (+bonus-malus d&ucirc; &agrave; la chaleur/froid de l'endroit)</div>";
        break;

      case "TÉLÉKINÉSIE":
        nb_tab = 5;
        tab1 = "MATIÈRE & TÉLÉKINÉSIE";
        tab2 = "Jouer avec les fluides";
        tab3 = "Jouer avec les corps solides";
        tab4 = "Jouer avec les corps énergies";
        tab5 = "Aide";
        icon1 = "backup.svg";
        icon2 = "telepathy.svg";
        icon3 = "rear-aura.svg";
        icon4 = "convince.svg";
        icon5 = "uncertainty.svg";
        titre = "Relations . Télépathie";
        description1 =
          "<h3><strong>Sph&egrave;re de la Mati&egrave;re &amp; T&eacute;l&eacute;kin&eacute;sie</strong></h3><p><span >Le Mega est plus concern&eacute; par les mat&eacute;riaux, leurs performances, leur beaut&eacute; ou leurs secrets, que par les rapports humains. La d&eacute;couverte de ses pouvoirs commence souvent par la <strong>T&eacute;l&eacute;kin&eacute;sie</strong> et ses farces faciles, puis s'affine en perception au c&oelig;ur de la mati&egrave;re, voire pour les plus talentueux, des capacit&eacute;s de passe-muraille (sortir un objet d'un coffre sans l'ouvrir est un art de haut niveau). </span></p><center><img src='systems/mega/images/telekinesie.png'></center>";
        description2 =
          "<h4>Comprimer/Déprimer l'air ou un autre gaz, déformer des liquides avec précisions permettent des effets variés<br>" +
          '<table style="background: transparent;border:none; border-collapse: separate;border-spacing: 15px; "><tr><td ' +
          bkground1 +
          'width="50%"><b>Grade 1.</b>&nbsp;</h4><h4>Souffler une bougie, poser de la buée sur un objet.</h4>' +
          "</td><td " +
          bkground2 +
          "width=\"50%\"><h4><strong>Grade 2.</strong></h4><h4>Petit courant d'air, condensation dans l'air, agiter un liquide.</h4></td></tr><tr><td " +
          bkground3 +
          'width="50%">' +
          "<h4><strong>Grade 3.</strong></h4><h4>Fort courant d'air, générer ou détourner un un ruisellement léger.</h4>" +
          "</td><td " +
          bkground4 +
          'width="50%"><h4><strong>Grade 4.</strong></h4><h4>Faire bondir une goutte d\'eau depuis la surface.</h4></td></tr><tr><td ' +
          bkground5 +
          'width="50%">' +
          "<h4><strong>Grade 5.</strong></h4><h4>Basse pression sur une zone, respiration difficile ; tourbillon de vent.</h4>" +
          "</td><td " +
          bkground6 +
          'width="50%"><h4><strong>Grade 6.</strong></h4><h4>Faire sortir lentement un liquide de son contenant, imiter les remous d\'une créature aquatique.</h4></td></tr><tr><td ' +
          bkground7 +
          'width="50%">' +
          "<h4><strong>Grade 7.</strong></h4><h4>Comprimer/détendre un gaz avec précision pour obtenir un effet (amortir une petite chute, surfer/glisser sur un fin coussin d'air, déséquilibrer une cible). Créer et maintenir une grosse bulle d'air sous l'eau, ou une sphère d'eau en l'air (taille d'un ballon). Ou une bulle de gaz comprimé qu'on peut déplacer (et enflammer avec une énergie Niv2).</h4>" +
          "</td><td " +
          bkground8 +
          "width=\"50%\"><h4><strong>Grade 8.</strong></h4><h4>Matelas/mur d'air pour arrêter une chute de quelques étages, créer progressivement des vagues dans un bassin, courir sur l'eau. </h4></td></tr><tr><td " +
          bkground9 +
          'width="50%">' +
          "<h4><strong>Grade 9.</strong></h4><h4>Surcomprimer l'air (ou un gaz présent) en pointe ou en disque pour servir de projectile (pierre, flèche, shuriken).</h4>" +
          "</td><td " +
          bkground10 +
          'width="50%"><h4><strong>Grade 10.</strong></h4><h4>Amplifier progressivement les ascendances d\'air naturelles pour créer un vent capable de pousser un petit voilier (avec la règle de Cumul).</h4></td></tr><tr><td ' +
          bkground11 +
          'width="50%">' +
          "<h4><strong>Grade 11.</strong></h4><h4>Générer et diriger précisément un vent assez fort pour aider (ou piéger) un planeur ou un deltaplane, forcer une pluie hésitante à tomber</h4>" +
          "</td><td " +
          bkground12 +
          'width="50%"><h4><strong>Grade 12.</strong></h4><h4>Déclencher une tempête.</h4></td></tr></table>';
        description3 =
          "<h4>Un choc peut régler divers problèmes, manipuler des objets complexes ou mous comme si l'on avait 4 ou 6 mains autorise des figures originales. <br>" +
          '<table style="background: transparent;border:none; border-collapse: separate;border-spacing: 15px; "><tr><td ' +
          bkground1 +
          'width="50%"><b>Grade 1.&nbsp;</b></h4><h4>Faire rouler ou basculer un petit objet, faible coup de poing à distance, faire trébucher quelqu\'un.</h4>' +
          "</td><td " +
          bkground2 +
          'width="50%"><h4><strong>Grade 2.</strong></h4><h4>Faire trembler et tomber des objets (surtout bancals), faire glisser quelque chose de léger sur un support lisse.</h4></td></tr><tr><td ' +
          bkground3 +
          'width="50%">' +
          "<h4><strong>Grade 3.</strong></h4><h4>Déplacement imprécis d'un petit objet « comme avec la main », aider ou freiner les efforts d'un individu visible (mod. : +2 ou -2Rg).</h4>" +
          "</td><td " +
          bkground4 +
          "width=\"50%\"><h4><strong>Grade 4.</strong></h4><h4>Manipulation lente mais précise « comme avec 2 mains » d'un objet peu lourd (quelques kilos) ou complexe posé sur un support (ou lévitation brève), modifier les propriétés optiques de l'air (illusions).</h4></td></tr><tr><td " +
          bkground5 +
          'width="50%">' +
          "<h4><strong>Grade 5.</strong></h4><h4>Manipulation « comme avec 4 mains » d'objets lourds (20-30 kilos) ou complexes et articulés (serrure, tissu).</h4>" +
          "</td><td " +
          bkground6 +
          "width=\"50%\"><h4><strong>Grade 6.</strong></h4><h4>Manipulation d'objets « comme avec 6 mains » très lourds (poids d'une personne), complexes, articulés ; gros tourbillon de vent ; générer des étincelles entre objets conducteurs, réparer ou aggraver une panne électrique ou électronique. Lancer, projeter : À partir de ce Niveau (et supérieurs), le personnage peut « lancer avec préci- sion » le type d'objet qu'il « manipule » 3 niveaux au-dessous. Donc au Niveau 6 : les petits objets du Niveau 3.</h4></td></tr><tr><td " +
          bkground7 +
          'width="50%">' +
          "<h4><strong>Grade 7.</strong></h4><h4>Manipulation lente « comme avec des palans » d'objets tels que voiture, petit bateau ; briser ou tordre un objet peu solide ; freiner la chute d'un corps.</h4>" +
          "</td><td " +
          bkground8 +
          'width="50%"><h4><strong>Grade 8.</strong></h4><h4>Donner une forme crédible immobile (humaine ou autre) à un nuage de poussière, déplacement lent d\'objets très lourds (camion, char), briser ou tordre des objets très solides.</h4></td></tr><tr><td ' +
          bkground9 +
          'width="50%">' +
          "<h4><strong>Grade 9.</strong></h4><h4> Donner une forme crédible mobile à un nuage de poussière et de petits objets, projeter des objets lourds ou soi-même à bonne distance avec précision, projeter avec précision ou freiner/arrêter la chute libre d'une personne, y compris soi-même.</h4>" +
          "</td><td " +
          bkground10 +
          'width="50%"><h4><strong>Grade 10.</strong></h4><h4> Créer une surpression dans un objet pour qu\'il explose, lévitation personnelle contrôlée Grade II. Faire léviter longuement et avec préci- sion un objet très lourd sans plus tenir compte de la Diff liée au temps (dure tant que le personnage garde le contrôle).</h4></td></tr><tr><td ' +
          bkground11 +
          'width="50%">' +
          "<h4><strong>Grade 11.</strong></h4><h4>Faire léviter longuement et avec précision un objet très lourd sans plus tenir compte de la Diff liée au temps (dure tant que le personnage garde le contrôle).</h4>" +
          "</td><td " +
          bkground12 +
          'width="50%"><h4><strong>Grade 12.</strong></h4><h4>Vitesse accélérée.</h4></td></tr></table>';
        description4 =
          "<h4>Chaleur, froid, électricité, vibrations sonores...<br>" +
          '<table style="background: transparent;border:none; border-collapse: separate;border-spacing: 15px;"><tr><td ' +
          bkground1 +
          'width="50%"><b>Grade 1.&nbsp;</b></h4><h4>Réchauffer/refroidir légèrement un petit objet ou un fluide (un verre).</h4>' +
          "</td><td " +
          bkground2 +
          'width="50%"><h4><strong>Grade 2.</strong></h4><h4>Faire sonner légèrement un objet en verre ou métal, allumer une petite ampoule à filament, enflammer une allumette ou une mèche.</h4/td></tr><tr><td ' +
          bkground3 +
          'width="50%">' +
          "<h4><strong>Grade 3.</strong></h4><h4>Créer des picotements électriques chez une personne, sans dommage mais déstabilisant ; chauffer une tasse en quelques minutes.</h4>" +
          "</td><td " +
          bkground4 +
          'width="50%"><h4><strong>Grade 4.</strong></h4><h4>Faire sonner fortement des objets en verre ou métal, créer une vibration sonore imprécise dans l\'air, chauffer/refroidir des petits volumes (bouteille) à la limite du bouillant/glacé.</h4></td></tr><tr><td ' +
          bkground5 +
          'width="50%">' +
          "<h4><strong>Grade 5.</strong></h4><h4>Réchauffer/refroidir un peu (ou beaucoup mais lentement) un volume moyen (petit tonneau), créer des notes sur un son simple (sifflement), perturber des objets électroniques.</h4>" +
          "</td><td " +
          bkground6 +
          "width=\"50%\"><h4><strong>Grade 6.</strong></h4><h4> Créer le son d'un instrument, d'une voix ou d'un bruit courant ; forcer une batterie à se recharger (lentement), infliger une petite décharge électrique à une personne.</h4></td></tr><tr><td " +
          bkground7 +
          'width="50%">' +
          "<h4><strong>Grade 7.</strong></h4><h4>Créer une onde de choc dans l'air ou l'eau, sans dommage mais étourdissante ; perturber des équipements électriques.</h4>" +
          "</td><td " +
          bkground8 +
          'width="50%"><h4><strong>Grade 8.</strong></h4><h4>Moduler des sons existants et réguliers (instrument, chant, bruit cyclique) pour harmoniser localement les Résonances et permettre momentanément le passage dans un « boyau » entre univers parallèles ou au travers d\'une faille normalement intraversable.</h4></td></tr><tr><td ' +
          bkground9 +
          'width="50%">' +
          "<h4><strong>Grade 9.</strong></h4><h4>Créer le son mélodique de plusieurs instruments, créer le son d'une (fausse) conversation à deux personnes ; créer un long arc électrique entre câbles électriques sous tension mais éloignés.</h4>" +
          "</td><td " +
          bkground10 +
          "width=\"50%\"><h4><strong>Grade 10.</strong></h4><h4>Influer légèrement sur l'ouverture ou la fermeture d'une déchirure de bonne taille entre univers parallèles.</h4></td></tr><tr><td " +
          bkground11 +
          'width="50%">' +
          "<h4><strong>Grade 11.</strong></h4><h4>Anticiper et détourner le point de chute d'un éclair naturel.</h4>" +
          "</td><td " +
          bkground12 +
          'width="50%"><h4><strong>Grade 12.</strong></h4><h4>Anticiper et détourner le point de chute d\'un éclair naturel.</h4></td></tr></table>';
        description5 =
          "<h3><strong>Univers Froids, univers Chauds</strong></h3><h4>Ce qu'il vous faut savoir est qu'il existe des univers qualifi&eacute;s de &laquo; Froids &raquo; : les lois physiques y sont rigides et la relation de cause &agrave; effet, base de la science, est pr&eacute;sente partout &agrave; travers l'espace-temps. Et d'autres univers o&ugrave; les r&egrave;gles de la physique s'assouplissent. On parle alors d'univers &laquo; Fluide &raquo; ou Chaud &raquo;, o&ugrave; il est possible, ponctuellement, de d&eacute;former ces lois. C'est ce que beaucoup appellent sortil&egrave;ges ou&nbsp; superpouvoirs - utilis&eacute;s par des mages, des m&eacute;diums et des super-h&eacute;ros - et que les rares sp&eacute;cialistes nomment &laquo; effets de vibration &raquo; ou de &laquo;&nbsp; r&eacute;sonance &raquo;, r&eacute;alis&eacute;s par des Vibrants ou des R&eacute;sonants.<br />Les machines et la technologie ont besoin, pour leur fonctionnement, que les lois d'un univers soient stables et Froides et ne font pas bon m&eacute;nage avec les univers Chauds, plus fluctuants. &Agrave; l'inverse, la &laquo; magie &raquo; aura beaucoup de mal &agrave; s'exprimer dans des continuums rigides et ne s'&eacute;panouira que dans les environnements Fluides et donc Chauds.<p></p>" +
          '</h4><h3>&nbsp;</h3><h3><strong>Utiliser les pouvoirs</strong></h3>Il existe 12 grades de pouvoir psi (r&eacute;sonnance).Les MEGAS commencent avec le grade 1.<br>Pour augmenter de grades, il faut payer en xp*2 (ex&nbsp;: Rang&nbsp;2 = 4XP&nbsp;; Rang 8 = 16XP). Mais pour pouvoir augmenter ces grades, il faut un minimum de rang.&nbsp;<br>Minimum de Rang &agrave; disposer pour am&eacute;liorer les grades&nbsp;:</p><center></center><table style="border-style: solid; width: 202px; margin-left: auto; margin-right: auto;" border="1" width="330" cellspacing="0" cellpadding="0"><tbody><tr><td style="width: 102.594px;"><p style="text-align: center;">Rang</p></td><td style="width: 93.4062px;"><p style="text-align: center;">Grade</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>4</p></td><td style="text-align: center; width: 93.4062px;"><p>2</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>4</p></td><td style="text-align: center; width: 93.4062px;"><p>3</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>6</p></td><td style="text-align: center; width: 93.4062px;"><p>4</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>6</p></td><td style="text-align: center; width: 93.4062px;"><p>5</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>8</p></td><td style="text-align: center; width: 93.4062px;"><p>6</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>8</p></td><td style="text-align: center; width: 93.4062px;"><p>7</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>10</p></td><td style="text-align: center; width: 93.4062px;"><p>8</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>10</p></td><td style="text-align: center; width: 93.4062px;"><p>9</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>12</p></td><td style="text-align: center; width: 93.4062px;"><p>10</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>12</p></td><td style="text-align: center; width: 93.4062px;"><p>11</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>14</p></td><td style="text-align: center; width: 93.4062px;"><p>12</p></td></tr></tbody></table>' +
          "<p><center><div style=\"width:60%; padding-top:10px; padding-bottom:10px;border: 3px solid #A0A0A0; text-align: left;background-color : rgba(255, 255, 255, 0.4);\"><i>&#9755; <b>La Difficult&eacute; est &eacute;gale &agrave; la somme :</b></p><p>- Du grade du pouvoir (ou des pouvoirs) utilis&eacute;(s)</p><p>- Du niveau total d&ucirc; &agrave; l'envergure du pouvoir utilis&eacute; : aire d'effet, distance, dur&eacute;e, ampleur de l'effet</p><i>&#9755; <b>Test de Pouvoir :</b> Talent (+Sp&eacute;).Psi.R&eacute;sonance (+bonus-malus d&ucirc; &agrave; la chaleur/froid de l'endroit)</div>";
        break;

      case "FLUX DE NEXUS":
        titre = "Logique . Nexus";
        tab1 = "FLUX de NEXUS";
        tab2 = "Flux des êtres, lieux et objets";
        tab3 = "Prescience";
        tab4 = "Aide";
        icon2 = "chain-lightning.svg";
        icon3 = "third-eye.svg";
        icon4 = "uncertainty.svg";
        icon1 = "wire-coil.svg";
        nb_tab = 4;
        description1 =
          "<h3><strong>Sph&egrave;re de la Logique &amp; Flux de Nexus</strong></h3><h4>Le Mega s'interresse plus au fonctionnement et aux relations abstraites des choses (et des gens), &agrave; leur mod&eacute;lisation coh&eacute;rente, qu'&agrave; leur existence r&eacute;elle et triviale. Sa perception des relations de cause &agrave; effet et un calcul insconscient des probalit&eacute;s lui apportent parfois une visualisation physique de ces encha&icirc;nements, les <strong>Nexus</strong> et des images de futurs ou pass&eacute;s possibles.</h4><p>Le <strong>Fileur,</strong> comme on l'appelle souvent, doit &ecirc;tre un peu com&eacute;dien et surjouer la subtilit&eacute; de son art, sous peine d'&ecirc;tre vite consid&eacute;r&eacute; par un groupe trop terre &agrave; terre comme le chien de chasse du service.</p><p>&nbsp;</p><center><img src='systems/mega/images/nexus.png'></center>";
        description2 =
          "<h4>Perception des liens logiques qui relient des lieux, des objets, des êtres, soit par l'habitude d'usage, soit par les évènements potentiels qui se concrétisent autour de ces pôles.<br>" +
          '<table style="background: transparent;border:none; border-collapse: separate;border-spacing: 15px; "><tr><td ' +
          bkground1 +
          'width="50%"><b>Grade 1.</b>&nbsp;</h4><h4>Vision fugace d\'écharpes de brume irréelle tissant un lien entre une personne, un objet qui lui est familier et des lieux proches ; détection du degré de Vibration alentour.</h4>' +
          "</td><td " +
          bkground2 +
          "width=\"50%\"><h4><strong>Grade 2.</strong></h4><h4>Vision des dysfonctionnements d'une machine ; détection de la présence ou de l'usage de Vibration sur un objet ou une personne.</h4></td></tr><tr><td " +
          bkground3 +
          'width="50%">' +
          "<h4><strong>Grade 3.</strong></h4><h4>Vision nette des \"liens de brume\", que l'on peut suivre sur de plus grandes distances, reliant une personne à d'autres personnes, des lieux ou des objets importants dans la trame des possibles la concernant.</h4>" +
          "</td><td " +
          bkground4 +
          'width="50%"><h4><strong>Grade 4.</strong></h4><h4>Détection, à plusieurs centaines de mètres de distance, de la présence d\'un Point de Transit ; détection des Megas en particulier, des Résonants en général, et donc des Nomegs.</h4></td></tr><tr><td ' +
          bkground5 +
          'width="50%">' +
          "<h4><strong>Grade 5.</strong></h4><h4>Les fils qui composent les liens de brume apparaissent de couleurs différentes, ce qui apporte des précisions : le lieu, l'objet ou la personne sont-ils bénéfiques ou toxiques pour la cible observée ? Ces relations sont-elles réfléchies, subies, passionnées ?</h4>" +
          "</td><td " +
          bkground6 +
          "width=\"50%\"><h4><strong>Grade 6.</strong></h4><h4>Effet papillon : le Résonant qui suit les liens de brume peut, en rencontrant les personnes, les lieux ou les objets que ces liens indiquent, avoir la vision d'évènements à effet papillon : des évènements mineurs à concrétiser afin qu'un but plus ambitieux soit atteint.</h4></td></tr><tr><td " +
          bkground7 +
          'width="50%">' +
          "<h4><strong>Grade 7.</strong></h4><h4>Projection de la conscience du Résonant le long des liens de brume, permettant de savoir où ils vont, même très loin et au-delà.</h4>" +
          "</td><td " +
          bkground8 +
          'width="50%"><h4><strong>Grade 8.</strong></h4><h4>Vision nette des zones où appliquer divers autres pouvoirs pour refermer une faille entre univers.</h4></td></tr><tr><td ' +
          bkground9 +
          'width="50%">' +
          '<h4><strong>Grade 9.</strong></h4><h4>Manipulation des Nexus pour trouver le "jumeau" d\'un personnage dans un autre univers.</h4>' +
          "</td><td " +
          bkground10 +
          'width="50%"><h4><strong>Grade 10.</strong></h4><h4>Manipulation des Nexus et projection le long de leurs fils pour espionner indirectement des personnes.</h4></td></tr><tr><td ' +
          bkground11 +
          'width="50%">' +
          "<h4><strong>Grade 11.</strong></h4><h4>Manipulation à distance des nexus pour peser sur l'état d'esprit d'une personne, d'un animal, ou donner un (tout) petit coup de pouce au hasard les concernant. Manipulation des Nexus et des liens de brume pour refermer une faille de petite taille</h4>" +
          "</td><td " +
          bkground12 +
          'width="50%"><h4><strong>Grade 12.</strong></h4><h4>Manipulation des Nexus et des liens de brume, pour refermer une faille de bonne taille.</h4></td></tr></table>';
        description3 =
          "<h4>Cette facette du pouvoir de Nexus est liée aux évènements et n'est attachée à aucun grade.<br>" +
          "<strong>Prescience localis&eacute;e</strong></h4>" +
          "<h4>Le personnage entrevoit un ou plusieurs &eacute;v&egrave;nements pr&eacute;cis et imminents li&eacute;s &agrave; un &ecirc;tre, un lieu ou un objet sur lequel il se concentre.</h4>" +
          "<h4><strong>Prescience large</strong></h4>" +
          "<h4>Le personnage entrevoit les cons&eacute;qunces les plus marquantes d'un évènement déjà en route ou imminent, sur un lieu vaste ou un grand groupe d'individus.</h4>";
        description4 =
          "<h3><strong>Univers Froids, univers Chauds</strong></h4><h4>Ce qu'il vous faut savoir est qu'il existe des univers qualifi&eacute;s de &laquo; Froids &raquo; : les lois physiques y sont rigides et la relation de cause &agrave; effet, base de la science, est pr&eacute;sente partout &agrave; travers l'espace-temps. Et d'autres univers o&ugrave; les r&egrave;gles de la physique s'assouplissent. On parle alors d'univers &laquo; Fluide &raquo; ou Chaud &raquo;, o&ugrave; il est possible, ponctuellement, de d&eacute;former ces lois. C'est ce que beaucoup appellent sortil&egrave;ges ou&nbsp; superpouvoirs - utilis&eacute;s par des mages, des m&eacute;diums et des super-h&eacute;ros - et que les rares sp&eacute;cialistes nomment &laquo; effets de vibration &raquo; ou de &laquo;&nbsp; r&eacute;sonance &raquo;, r&eacute;alis&eacute;s par des Vibrants ou des R&eacute;sonants.<br />Les machines et la technologie ont besoin, pour leur fonctionnement, que les lois d'un univers soient stables et Froides et ne font pas bon m&eacute;nage avec les univers Chauds, plus fluctuants. &Agrave; l'inverse, la &laquo; magie &raquo; aura beaucoup de mal &agrave; s'exprimer dans des continuums rigides et ne s'&eacute;panouira que dans les environnements Fluides et donc Chauds.<p></p>" +
          '</h4><h3>&nbsp;</h3><h3><strong>Utiliser les pouvoirs</strong></h3>Il existe 12 grades de pouvoir psi (r&eacute;sonnance).Les MEGAS commencent avec le grade 1.<br>Pour augmenter de grades, il faut payer en xp*2 (ex&nbsp;: Rang&nbsp;2 = 4XP&nbsp;; Rang 8 = 16XP). Mais pour pouvoir augmenter ces grades, il faut un minimum de rang.&nbsp;<br>Minimum de Rang &agrave; disposer pour am&eacute;liorer les grades&nbsp;:</p><center></center><table style="border-style: solid; width: 202px; margin-left: auto; margin-right: auto;" border="1" width="330" cellspacing="0" cellpadding="0"><tbody><tr><td style="width: 102.594px;"><p style="text-align: center;">Rang</p></td><td style="width: 93.4062px;"><p style="text-align: center;">Grade</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>4</p></td><td style="text-align: center; width: 93.4062px;"><p>2</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>4</p></td><td style="text-align: center; width: 93.4062px;"><p>3</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>6</p></td><td style="text-align: center; width: 93.4062px;"><p>4</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>6</p></td><td style="text-align: center; width: 93.4062px;"><p>5</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>8</p></td><td style="text-align: center; width: 93.4062px;"><p>6</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>8</p></td><td style="text-align: center; width: 93.4062px;"><p>7</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>10</p></td><td style="text-align: center; width: 93.4062px;"><p>8</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>10</p></td><td style="text-align: center; width: 93.4062px;"><p>9</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>12</p></td><td style="text-align: center; width: 93.4062px;"><p>10</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>12</p></td><td style="text-align: center; width: 93.4062px;"><p>11</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>14</p></td><td style="text-align: center; width: 93.4062px;"><p>12</p></td></tr></tbody></table>' +
          "<p><center><div style=\"width:60%; padding-top:10px; padding-bottom:10px;border: 3px solid #A0A0A0; text-align: left;background-color : rgba(255, 255, 255, 0.4);\"><i>&#9755; <b>La Difficult&eacute; est &eacute;gale &agrave; la somme :</b></p><p>- Du grade du pouvoir (ou des pouvoirs) utilis&eacute;(s)</p><p>- Du niveau total d&ucirc; &agrave; l'envergure du pouvoir utilis&eacute; : aire d'effet, distance, dur&eacute;e, ampleur de l'effet</p><i>&#9755; <b>Test de Pouvoir :</b> Talent (+Sp&eacute;).Psi.R&eacute;sonance (+bonus-malus d&ucirc; &agrave; la chaleur/froid de l'endroit)</div>";
        break;

      case "PRÉSENCE D'ESPRIT":
        titre = "Invisible . Présence d'esprit";
        tab1 = "INVISIBLE & PRÉSENCE D'ESPRIT";
        tab2 = "Médium";
        tab3 = "Symboles et intentions diffuses";
        tab4 = "Aide";
        nb_tab = 4;
        icon1 = "crystal-ball.svg";
        icon2 = "psychic-waves.svg";
        icon3 = "archive-research.svg";
        icon4 = "uncertainty.svg";
        description1 =
          "<h3><strong>Sph&egrave;re de l'Invisible &amp; Pr&eacute;sence d'Esprit</strong></h3><p>On le surnomme le M&eacute;dium car il cherche syst&eacute;matiquement &agrave; percevoir les choses derri&egrave;re les choses, le sens cach&eacute; derri&egrave;re le sens apparent, les pr&eacute;sences&nbsp; impalpables, ce qui manque plut&ocirc;t que ce qui est pr&eacute;sent, les sentiments au-del&agrave; des sensations, les id&eacute;es au-del&agrave; des mots. Litt&eacute;raire, voire po&egrave;te ou un peu mystique, son Pouvoir (et son fardeau) le rend sensible aux <strong>Pr&eacute;sences d'esprit</strong>, ces &eacute;manations, passives ou conscientes, n&eacute;es de la forte expression psychique qui s'est ancr&eacute;e sur un&nbsp;<br>objet ou un lieu, par la force d'un drame ou l'accumulation de croyances. Cela peut aller de la vision d'une sc&egrave;ne attach&eacute;e &agrave; un objet &agrave; une discussion avec l'esprit d'une rivi&egrave;re.</p><p>Son dilemme permanent est de savoir si sa curiosit&eacute; envers un objet ou un lieu va lui apporter une vision positive ou traumatisante...&nbsp;</p><p><br>Et s'il y a bien un type de lieu charg&eacute;, ce sont les Points de Transit, dont il peut reconna&icirc;tre l'auteur, que ce soit un Mega qu'il conna&icirc;t ou un dont il a d&eacute;j&agrave; utilis&eacute; un autre Point de Transit, et qui a peut&ecirc;tre v&eacute;cu des si&egrave;cles auparavant.</p><center><img src='systems/mega/images/medium.png'></center>";
        description2 =
          "<h4>Percevoir et intéragir avec les divers manifestations invisibles du psychisme des êtes pensants. Impressions ou visions inspirées par l'empreinte psychique laissée sur un lieu, un objet ; dialogue avec les Présences d'esprits, consciences simples nées de ces empreintes psychiques, fortes et répétées ; perception de l'influence des Nautoniers.<br>" +
          '<table style="background: transparent;border:none; border-collapse: separate;border-spacing: 15px; "><tr><td ' +
          bkground1 +
          'width="50%"><b>Grade 1.</b>&nbsp;</h4><h4>Lecture des souvenirs (fugaces) imprimés par le psychisme d\'un être sur un support affectif fort.</h4>' +
          "</td><td " +
          bkground2 +
          "width=\"50%\"><h4><strong>Grade 2.</strong></h4><h4>Détection du niveau de Vibration sur un lieu, un objet ou une personne ; percevoir les sentiments de l'auteur d'un document manuscrit.</h4></td></tr><tr><td " +
          bkground3 +
          'width="50%">' +
          "<h4><strong>Grade 3.</strong></h4><h4>Sentir les Présences d'esprits fortes ou anciennes aux alentours et commuiquer superficiellement avec elles si elles le souhaitent.</h4>" +
          "</td><td " +
          bkground4 +
          " width=\"50%\"><h4><strong>Grade 4.</strong></h4><h4>Lire une Présence d'esprit : les plus simples ne communiquent pas, mais peuvent réémettre ce qu'elles ont perçu autour d'elles.</h4></td></tr><tr><td " +
          bkground5 +
          'width="50%">' +
          "<h4><strong>Grade 5.</strong></h4><h4>Relier les Présences d'esprits voisines, afin de combiner leurs semi-consciences.</h4>" +
          "</td><td " +
          bkground6 +
          'width="50%"><h4><strong>Grade 6.</strong></h4><h4>Avatar : le Résonant accepte d\'être "chevauché", investi par une Présence d\'esprit évoluée, et de devenir momentanément ses yeux et ses oreilles.</h4></td></tr><tr><td ' +
          bkground7 +
          'width="50%">' +
          "<h4><strong>Grade 7.</strong></h4><h4>Image : Le Résonnant : le Résonnant est capable d'enrichir la Présence d'esprit d'une image (vue ou imaginée par lui), et que verront désormais les visiteurs qui passeront.</h4>" +
          "</td><td " +
          bkground8 +
          "width=\"50%\"><h4><strong>Grade 8.</strong></h4><h4>Sentir l'influence ou l'empreinte d'une Présence d'esprit forte sur des individus qui l'ont côtoyée.</h4></td></tr><tr><td " +
          bkground9 +
          'width="50%">' +
          "<h4><strong>Grade 9.</strong></h4><h4>Esprit de Nautonier : le Résonant peut ressentir l'influence d'un Nautonier dans les phénomènes qui l'entourent, et supporter de dialoguer de manière symbolique avec lui. Un Mega peut l'identifier comme l'émanation d'un Guetteur.</h4>" +
          "</td><td " +
          bkground10 +
          "width=\"50%\"><h4><strong>Grade 10.</strong></h4><h4>Chasser une Présence d'esprit néfaste. Ce pouvoir est plus facile à utiliser combiné avec Emprisonner une Présence d'esprit, un pouvoir de Chakras.</h4></td></tr><tr><td " +
          bkground11 +
          ' width="50%">' +
          "<h4><strong>Grade 11.</strong></h4><h4>Identifier la présence d'entités parmi les esprits attachés aux liens de brume.</h4>" +
          "</td><td " +
          bkground12 +
          'width="50%"><h4><strong>Grade 12.</strong></h4><h4>Invoquer un esprit-avatar de Nautonier.</h4></td></tr></table>';
        description3 =
          "<h4>Perception instinctive du sens caché de textes hermétiques, poétiques, cryptiques ou d'autres formes de messages symboliques.<br>" +
          '<table style="background: transparent;border:none; border-collapse: separate;border-spacing: 15px; "><tr><td ' +
          bkground1 +
          "width=\"50%\"><b>Grade 1.&nbsp;</b></h4><h4>Sentiment de l'existence d'un message caché dans un texte, dans des signes et symboles, vague idée de son intention (avertissement, conseil, partage d'un secret, etc...).</h4>" +
          "</td><td " +
          bkground2 +
          'width="50%"><h4><strong>Grade 2.</strong></h4><h4>Identification des coïncidences intentionnelles et conscience du sens général dans un message hermétique, sans plus de détails.</h4></td></tr><tr><td ' +
          bkground3 +
          'width="50%">' +
          "<h4><strong>Grade 3.</strong></h4><h4>Vision synthétique des messages véhiculés par un texte ou une autre forme de message. Perception de certaines des motivations animant le ou les auteurs.</h4>" +
          "</td><td " +
          bkground4 +
          'width="50%"><h4><strong>Grade 4.</strong></h4><h4>Identification et vague compréhension des messages cachés dans les messages cachés et destinés aux initiés de haut niveau.</h4></td></tr><tr><td ' +
          bkground5 +
          'width="50%">' +
          "<h4><strong>Grade 5.</strong></h4><h4>Possibilité d'identifier une personne connue ayant anonymement imprimé une volonté personnelle dans un texte. Un Mega peut reconnaître la signature d'un créateur d'un point de Transit dont il a déjà utilisé d'autres Tétraèdres.</h4>" +
          "</td><td " +
          bkground6 +
          'width="50%"><h4><strong>Grade 6.</strong></h4><h4>Sentiment général, à travers plusieurs textes ou symboles occultes étudiés, des projets, des plans et des pièges tissés par les auteurs de cet ensemble.</h4></td></tr><tr><td ' +
          bkground7 +
          'width="50%">' +
          '<h4><strong>Grade 7.</strong></h4><h4>Idem Grade 6, mais le Résonant peut percevoir les "zones aveugles" évitées par les auteurs des textes ou symboles étudiés : tabous, peurs, ignorances...</h4>' +
          "</td><td " +
          bkground8 +
          'width="50%"><h4><strong>Grade 8.</strong></h4><h4>Le Résonant peut décoder les rôles officiels et officieux dans un petit groupe de personnes, connues directement ou à travers des témoignages précis.</h4</td></tr><tr><td ' +
          bkground9 +
          'width="50%">' +
          "<h4><strong>Grade 9.</strong></h4><h4>Le Résonant peut ressentir l'évolution d'un plan occulte à travers un faisceau d'évènements ou de textes apparamment sans rapport.</h4>" +
          "</td><td " +
          bkground10 +
          "width=\"50%\"><h4><strong>Grade 10.</strong></h4><h4>Le Résonant peut, sur des signes très discrets, deviner s'il est l'objet d'une attention particulière. Un Mega peut trouver facilement le chemin, sans Tétraèdre témoin, de point de Transit créés par un Mega dont il a déjà utilisé d'autres créations.</h4></td></tr><tr><td " +
          bkground11 +
          'width="50%">' +
          "<h4><strong>Grade 11.</strong></h4><h4>Perception fine de milliers de petits signes permettant au Résonant de localiser et sentir des Présences d'esprit extrêmement ténues ou dont il ignorait l'existence.</h4>" +
          "</td><td " +
          bkground12 +
          "width=\"50%\"><h4><strong>Grade 12.</strong></h4><h4>Perceotions fine de milliers de petits signes permettant au Résonnant de lire l'histoire récente ou ancienne d'un lieu, même s'il n'y a pas ou plus de traces psychiques fortes qu'il puisse analyser...</h4></td></tr></table>";
        description4 =
          "<h3><strong>Univers Froids, univers Chauds</strong></h3><h4>Ce qu'il vous faut savoir est qu'il existe des univers qualifi&eacute;s de &laquo; Froids &raquo; : les lois physiques y sont rigides et la relation de cause &agrave; effet, base de la science, est pr&eacute;sente partout &agrave; travers l'espace-temps. Et d'autres univers o&ugrave; les r&egrave;gles de la physique s'assouplissent. On parle alors d'univers &laquo; Fluide &raquo; ou Chaud &raquo;, o&ugrave; il est possible, ponctuellement, de d&eacute;former ces lois. C'est ce que beaucoup appellent sortil&egrave;ges ou&nbsp; superpouvoirs - utilis&eacute;s par des mages, des m&eacute;diums et des super-h&eacute;ros - et que les rares sp&eacute;cialistes nomment &laquo; effets de vibration &raquo; ou de &laquo;&nbsp; r&eacute;sonance &raquo;, r&eacute;alis&eacute;s par des Vibrants ou des R&eacute;sonants.<br />Les machines et la technologie ont besoin, pour leur fonctionnement, que les lois d'un univers soient stables et Froides et ne font pas bon m&eacute;nage avec les univers Chauds, plus fluctuants. &Agrave; l'inverse, la &laquo; magie &raquo; aura beaucoup de mal &agrave; s'exprimer dans des continuums rigides et ne s'&eacute;panouira que dans les environnements Fluides et donc Chauds.<p></p>" +
          '</h4><h3>&nbsp;</h3><h3><strong>Utiliser les pouvoirs</strong></h3>Il existe 12 grades de pouvoir psi (r&eacute;sonnance).Les MEGAS commencent avec le grade 1.<br>Pour augmenter de grades, il faut payer en xp*2 (ex&nbsp;: Rang&nbsp;2 = 4XP&nbsp;; Rang 8 = 16XP). Mais pour pouvoir augmenter ces grades, il faut un minimum de rang.&nbsp;<br>Minimum de Rang &agrave; disposer pour am&eacute;liorer les grades&nbsp;:</p><center></center><table style="border-style: solid; width: 202px; margin-left: auto; margin-right: auto;" border="1" width="330" cellspacing="0" cellpadding="0"><tbody><tr><td style="width: 102.594px;"><p style="text-align: center;">Rang</p></td><td style="width: 93.4062px;"><p style="text-align: center;">Grade</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>4</p></td><td style="text-align: center; width: 93.4062px;"><p>2</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>4</p></td><td style="text-align: center; width: 93.4062px;"><p>3</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>6</p></td><td style="text-align: center; width: 93.4062px;"><p>4</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>6</p></td><td style="text-align: center; width: 93.4062px;"><p>5</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>8</p></td><td style="text-align: center; width: 93.4062px;"><p>6</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>8</p></td><td style="text-align: center; width: 93.4062px;"><p>7</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>10</p></td><td style="text-align: center; width: 93.4062px;"><p>8</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>10</p></td><td style="text-align: center; width: 93.4062px;"><p>9</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>12</p></td><td style="text-align: center; width: 93.4062px;"><p>10</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>12</p></td><td style="text-align: center; width: 93.4062px;"><p>11</p></td></tr><tr><td style="text-align: center; width: 102.594px;"><p>14</p></td><td style="text-align: center; width: 93.4062px;"><p>12</p></td></tr></tbody></table>' +
          "<p><center><div style=\"width:60%; padding-top:10px; padding-bottom:10px;border: 3px solid #A0A0A0; text-align: left;background-color : rgba(255, 255, 255, 0.4);\"><i>&#9755; <b>La Difficult&eacute; est &eacute;gale &agrave; la somme :</b></p><p>- Du grade du pouvoir (ou des pouvoirs) utilis&eacute;(s)</p><p>- Du niveau total d&ucirc; &agrave; l'envergure du pouvoir utilis&eacute; : aire d'effet, distance, dur&eacute;e, ampleur de l'effet</p><i>&#9755; <b>Test de Pouvoir :</b> Talent (+Sp&eacute;).Psi.R&eacute;sonance (+bonus-malus d&ucirc; &agrave; la chaleur/froid de l'endroit)</div>";
        break;
    }

    let tab_3 = new TabbedDialog(
      {
        title: titre,
        header: "",
        footer: "",
        tabs: [
          { title: tab1, content: description1, icon: icon1 },
          { title: tab2, icon: icon2, content: description2 },
          { title: tab3, icon: icon3, content: description3 },
        ],
        buttons: {},
        default: "two",
        render: (html) =>
          console.log("Register interactivity in the rendered dialog"),
        close: (html) =>
          console.log(
            "This always is logged no matter which option is chosen"
          ),
      },
      myDialogOptions
    );

    let tab_4 = new TabbedDialog(
      {
        title: titre,
        header: "",
        footer: "",
        tabs: [
          { title: tab1, content: description1, icon: icon1 },
          { title: tab2, icon: icon2, content: description2 },
          { title: tab3, icon: icon3, content: description3 },
          { title: tab4, icon: icon4, content: description4 },
        ],
        buttons: {},
        default: "two",
        render: (html) =>
          console.log("Register interactivity in the rendered dialog"),
        close: (html) =>
          console.log(
            "This always is logged no matter which option is chosen"
          ),
      },
      myDialogOptions
    );

    let tab_5 = new TabbedDialog(
      {
        title: titre,
        header: "",
        footer: "",
        tabs: [
          { title: tab1, content: description1, icon: icon1 },
          { title: tab2, icon: icon2, content: description2 },
          { title: tab3, icon: icon3, content: description3 },
          { title: tab4, icon: icon4, content: description4 },
          { title: tab5, icon: icon5, content: description5 },
        ],
        buttons: {},
        default: "two",
        render: (html) =>
          console.log("Register interactivity in the rendered dialog"),
        close: (html) =>
          console.log(
            "This always is logged no matter which option is chosen"
          ),
      },
      myDialogOptions
    );
    if (nb_tab == 3) {
      tab_3.render(true);
    } else if (nb_tab == 4) {
      tab_4.render(true);
    } else if (nb_tab == 5) {
      tab_5.render(true);
    }
    break;
}