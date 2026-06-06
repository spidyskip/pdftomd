---
name: notion-design
description: Istruzioni di design per ricreare interfacce in stile Notion-Ink (Neo-brutalista minimalista) con layout a forte contrasto, contorni neri da 3-4px, ombre solide sfalsate senza sfocatura e texture di sfondo puntinate (canvas dots).
---

# Notion-Ink Design Skill Guide

Questo documento delinea i pillar visivi, interattivi e di layout per realizzare applicazioni e interfacce ispirate all'estetica iconica di Notion (tratti a inchiostro caldi, solidi geometrici 3D minimalisti, palette cromatica calda e accogliente) combinata con elementi del Neo-Brutalismo moderno ("Artistic Flair").

---

## 🎨 I 5 Pillar dell'Estetica Notion-Ink

### 1. Palette Cromatica "Calda & Organica"
La base deve evitare il bianco puro spettrale e preferire tonalità calde di off-white o crema:
- **Sfondo Primario:** `#F7F6F3` (il grigio/crema caldo di Notion) o `#FBF9F5` (per elementi in risalto).
- **Tratto Primario:** Nero fumo puro `#000000` o carbone ultra-scuro `#1A1A1A`.
- **Colori d'Accento (Flat Pastel):** Utilizzare campioni di colore piatto non sfumati per elementi di stato e pulsanti attivi:
  - Giallo Notion: `bg-amber-400`
  - Blu Notion: `bg-blue-400`
  - Verde Notion: `bg-emerald-400`
  - Rosa Notion: `bg-rose-400`

### 2. Spessore dei Contorni & Cornici (Stroke Weight)
L'estetica si basa su linee di divisione e bordi estremamente marcati, che richiamano il tratto di una penna stilografica o di un pennarello d'inchiostro:
- **Bordi Standard:** `border-2 border-black` (2px solid per componenti medi).
- **Bordi di Forza (Contenitori primari / Navigation):** `border-4 border-black` o `border-3 border-black` (3-4px solid per enfatizzare strutture macro).
- **Bordi Disegnati/Tratteggiati:** `border-dashed` per sezioni di input o zone di drop file.

### 3. Ombre Piatte Sfalsate (Hard Shadows)
Evitare qualsiasi gradiente o sfocatura (`box-shadow` morbido) per gli elementi 3D. L'effetto tridimensionale è ottenuto tramite ombre solide, traslate di un offset simmetrico:
- **Medium Shadow:** `shadow-[4px_4px_0px_#000]`
- **Large Container Shadow / 3D Block:** `shadow-[8px_8px_0px_#000]` o `shadow-[12px_12px_0px_#000]`
- **Comportamento Hover:** Al passaggio del mouse, gli elementi devono simulare di essere premuti contraendo l'offset: `hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[4px_4px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none`.

### 4. Iconografia & Disegni Lineari
- Usare esclusivamente icone lineari ad alto contrasto (ad esempio da `lucide-react`) con tratti spessi (`stroke-width: 2.5` o `3`).
- Tutte le illustrazioni all'interno dell'app devono richiamare il formato stile schizzo a mano libera o tracciato vettoriale pulito monocromatico, esaltando la silhouette geometrica del soggetto.

### 5. Tipografia di Contrasto (Serif vs Mono)
- **Titoli ed Intestazioni Principali:** Utilizzare un font **Serif** di classe o editoriale (es. *Playfair Display* o *Georgia*) in stile corsivo/grassetto per richiamare note letterarie o di design d'archivio (`font-serif italic font-black`).
- **Testo di Servizio & Dati:** Utilizzare un font **Monospace** (es. *JetBrains Mono*, *Fira Code*) in maiuscolo per coordinate, metadati, e tag di stato (`font-mono text-[10px] tracking-widest uppercase`).
- **Interfaccia e Contenuti Comuni:** Utilizzare un font **Sans-Serif** geometrico e super leggibile (es. *Inter*) (`font-sans`).

---

## 📐 Struttura e Layout Standard del Template

Per garantire che un'applicazione ispirata a questo design sia facile da navigare e mantenga un'interazione fluida, strutturare la pagina nel seguente modo:

```
+--------------------------------------------------------------+
| [N] / Avatar Reimagined / Studio_Ink_Studio         v1.0.4   |  <- Navigatore compatto (64px, bordo passante)
+--------------------------------------------------------------+
|  STILE NOTION INK (Banner d'Intestazione a Contenitore Nero)  |  <- Titolo editoriale in Serif
|  "Un esercizio di precisione visiva e transfer estetico..."    |
+--------------------------------------------------------------+
| [Confronto] [Tabella] [Analisi]  <- Tabs di Navigazione 3D  |
+-------------------------------------+------------------------+
|                                     | PANNELLO DI CONTROLLO  |
|                                     | +--------------------+ |
|                                     | | [Mostra Stile]     | |
|          VISUALIZZATORE             | | [Mostra Origin.]   | |
|         CONFRONTO ATTIVO            | +--------------------+ |
|    (con griglia puntinata           | | [Scegli Colore]    | |
|     di sfondo puntinata)                | +--------------------+ |
|                                     | |  [Tasto Scarica]   | |
|                                     | +--------------------+ |
+-------------------------------------+------------------------+
| Analizzatore Stile: Rendered                     Scale: 1:1  |  <- Footer tecnico stile stampato
+--------------------------------------------------------------+
```

---

## 🛠️ Tailwind Quick-Utility Classes di Riferimento

Usa questa configurazione CSS/utility per applicare in sicurezza lo stile Notion:

```css
/* In index.css */
@utility notion-card {
  border: 3px solid #000;
  box-shadow: 6px 6px 0px #000;
  background: #fff;
  transition: all 0.2s ease;
}

@utility canvas-area {
  background-image: radial-gradient(#d1d1d1 1px, transparent 1px);
  background-size: 20px 20px;
}
```
