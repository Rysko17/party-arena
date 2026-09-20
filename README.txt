PARTY ARENA V5.9 — CORRECTIF LANCEMENT

BUG TROUVÉ ET CORRIGÉ :
La V5.8 gardait par erreur une ancienne fonction de lancement qui cherchait le sélecteur global « rounds ».
Ce sélecteur avait été supprimé quand on a ajouté 5/10/15/20 manches PAR JEU.
Résultat : JavaScript s'arrêtait au clic sur JOUER et la partie ne démarrait jamais.

V5.9 :
- JOUER envoie maintenant gameRounds pour chaque jeu.
- Le serveur confirme d'abord les réglages, puis confirme le lancement.
- 5/10/15/20 manches indépendamment pour chaque jeu.
- Jeux séquentiels, pas mélangés.
- Recommencer / changer les réglages à la fin.
- Validation/refus des points pour les jeux oraux.
