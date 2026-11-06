# AlloProf — Identité visuelle

La référence pour tout ce qui porte la marque AlloProf : applications, affiches, maquettes, réseaux sociaux.

- Couleurs en version machine : [`tokens.json`](tokens.json)
- Logo : [`logo-icone.svg`](logo-icone.svg)
- Dans le frontend, ces valeurs vivent dans `app/globals.css`. Si une couleur change, mettre à jour les deux endroits.

## Couleurs

| Rôle | Nom | Hex | Usage |
|---|---|---|---|
| Primaire | Pétrole | `#0F5C63` | Boutons principaux, logo, navigation active, liens |
| Accent | Ambre | `#F2A93B` | Petites touches : icônes, mises en avant |
| Fond | Blanc cassé | `#FAF8F3` | Fond des pages et des supports |
| Surface | Blanc | `#FFFFFF` | Cartes |
| Texte | Presque noir | `#14292B` | Titres et texte courant |
| Texte secondaire | Gris pétrole | `#566769` | Descriptions, légendes |
| Surface douce | Sable | `#F2EFE7` | Zones discrètes |
| Teinte | Pétrole clair | `#E3EFEF` | Survol, élément actif |
| Bordure | Sable foncé | `#E5E1D8` | Contours, séparateurs |

## Règles

1. **Jamais de texte blanc sur l'ambre** : il est illisible (contraste 2,0:1). Sur l'ambre, le texte est `#14292B`.
2. **L'ambre reste un accent.** Pas de bouton principal ni de grand aplat ambre dans l'application, pour ne pas le confondre avec les badges orange (« Suspendue », « En attente »). Une affiche peut l'utiliser plus largement.
3. **Les couleurs de statut ne sont pas des couleurs de marque.** Le bleu, le vert, l'orange et le rouge sont réservés aux badges de statut de l'application (voir `03-ECRANS-ET-PARCOURS.md`, section 1).

## Contrastes mesurés (WCAG)

| Texte sur fond | Ratio | Convient pour |
|---|---|---|
| Blanc sur pétrole | 7,69:1 | Tout texte |
| Texte `#14292B` sur blanc cassé | 14,32:1 | Tout texte |
| Pétrole sur blanc cassé | 7,24:1 | Tout texte |
| Gris pétrole sur blanc cassé | 5,59:1 | Tout texte |
| Texte `#14292B` sur ambre | 7,61:1 | Tout texte |
| Ambre sur pétrole | 3,85:1 | Icônes et grands titres seulement |
| Blanc sur ambre | 2,00:1 | **À proscrire** |

## Logo

Un carré pétrole aux coins arrondis, avec une toque de diplômé ambre, suivi du mot « AlloProf » en Geist semi-gras.

- Le fichier `logo-icone.svg` contient uniquement l'icône. C'est aussi le favicon de l'application.
- Ne pas changer ses couleurs, ni le déformer.
- Ce logo est provisoire : il utilise l'icône « graduation-cap » de Lucide (licence ISC), qui n'est pas exclusive à AlloProf. Prévoir un logo dédié pour un dépôt de marque.

## Typographie

- **Geist** pour tout le texte, **Geist Mono** pour les codes et les chiffres alignés (ex. le code du jour). Les deux sont gratuites (licence OFL), disponibles sur Google Fonts.
- Titres en semi-gras, texte courant en normal.

## Formes

Coins arrondis (rayon de base 10 px, cartes un peu plus), fonds clairs, peu d'images : la plupart des utilisateurs sont sur téléphone, parfois avec une connexion lente.
