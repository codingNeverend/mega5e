# Test des Modifications des Onglets Latéraux

## Modifications effectuées

1. **Template HTML (actor-sheet.html)** :
   - Suppression de la navigation par onglets horizontaux
   - Ajout d'une nouvelle structure en flex avec navigation latérale
   - Création de boutons latéraux avec icônes Font Awesome

2. **Styles CSS (mega.css)** :
   - Masquage des anciens onglets horizontaux
   - Ajout de styles pour la navigation latérale
   - Styles responsifs pour les boutons latéraux
   - Animations de survol et de sélection

3. **JavaScript (actor-sheet.js)** :
   - Modification du sélecteur de navigation
   - Ajout du gestionnaire d'événements pour les boutons latéraux
   - Méthode de gestion des clics (\_onSideTabClick)
   - Méthode d'initialisation de l'onglet actif

## Structure des boutons latéraux

- **Description** : Icône utilisateur (fas fa-user)
- **Attributs** : Icône graphique (fas fa-chart-bar)
- **Combat** : Icône épée (fas fa-sword)
- **Inventaire** : Icône sac à dos (fas fa-backpack)
- **MJ** : Icône œil (fas fa-eye) - visible uniquement pour le MJ

## Comment tester

1. Charger FoundryVTT
2. Ouvrir une fiche de personnage
3. Vérifier que les boutons latéraux apparaissent sur la droite
4. Tester les clics pour changer d'onglet
5. Vérifier les animations de survol et d'activation

## Points à vérifier

- [ ] Les boutons apparaissent correctement sur la droite
- [ ] Les clics changent bien les onglets
- [ ] L'onglet correct est actif au chargement
- [ ] Les animations fonctionnent (survol et activation)
- [ ] Les tooltips des boutons s'affichent
- [ ] La mise en page s'adapte à la taille de la fenêtre
