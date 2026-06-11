import type { ReactNode } from "react";
import ReactDOM from "react-dom/client";
import "../styles/tokens.css";
import "../index.css";
import "../i18n";
import "./previewPage.css";
import Card from "../components/cards/Card";
import Jokers from "../components/jokers/Jokers";
import { makeCard } from "../stories/fixtures";
import { createJokerCatalog, withEdition, type Joker } from "../items/jokers";

const CATALOG = createJokerCatalog();

function jokerById(id: string): Joker {
  const joker = CATALOG.find((j) => j.id === id);
  if (!joker) throw new Error(`Unknown joker id: ${id}`);
  return joker;
}

interface LabelledProps {
  readonly label: string;
  readonly children: ReactNode;
}

function Labelled({ label, children }: LabelledProps) {
  return (
    <div className="preview-cell">
      {children}
      <span className="preview-caption">{label}</span>
    </div>
  );
}

function Section1159() {
  return (
    <section id="preview-1159" className="preview-section">
      <h2>#1159 — Enhancement value replaces the center suit pip</h2>
      <div className="preview-row">
        <Labelled label="Plain (unchanged)">
          <Card card={makeCard(101, "7", "spades")} decorative />
        </Labelled>
        <Labelled label="Bonus: +30 chips">
          <Card card={makeCard(102, "5", "spades", { enhancement: "bonus" })} decorative />
        </Labelled>
        <Labelled label="Mult: +4 Mult">
          <Card card={makeCard(103, "9", "hearts", { enhancement: "mult" })} decorative />
        </Labelled>
        <Labelled label="Gold: +$3 held">
          <Card card={makeCard(104, "7", "diamonds", { enhancement: "gold" })} decorative />
        </Labelled>
        <Labelled label="Steel: ×1.5 in hand">
          <Card card={makeCard(105, "10", "clubs", { enhancement: "steel" })} decorative />
        </Labelled>
        <Labelled label="Glass: ×2 Mult">
          <Card card={makeCard(106, "4", "diamonds", { enhancement: "glass" })} decorative />
        </Labelled>
        <Labelled label="Wild (no value — keeps pip)">
          <Card card={makeCard(107, "3", "hearts", { enhancement: "wild" })} decorative />
        </Labelled>
        <Labelled label="Face card (decoration kept)">
          <Card card={makeCard(108, "K", "hearts", { enhancement: "gold" })} decorative />
        </Labelled>
        <Labelled label="Face-down (value hidden)">
          <Card card={makeCard(109, "5", "spades", { enhancement: "bonus", faceDown: true })} decorative />
        </Labelled>
      </div>
    </section>
  );
}

function Section1160() {
  return (
    <section id="preview-1160" className="preview-section">
      <h2>#1160 — Lucky card: clover icon + odds label</h2>
      <div className="preview-row">
        <Labelled label="Proposed: mult odds only">
          <Card card={makeCard(201, "9", "hearts", { enhancement: "lucky" })} decorative />
        </Labelled>
        <Labelled label="Alternative: both odds">
          <span className="card card-black card-suit-clubs card-enhancement-lucky" aria-hidden="true">
            <span className="card-corner card-corner-top">
              <span className="card-rank">2</span>
              <span className="card-suit">♣</span>
            </span>
            <span className="card-center-lucky">
              <span className="card-center-lucky-icon">☘</span>
              <span className="card-center-lucky-odds">1 in 5 ★</span>
              <span className="card-center-lucky-odds">1 in 15 $</span>
            </span>
          </span>
        </Labelled>
        <Labelled label="Bonus card for contrast">
          <Card card={makeCard(203, "9", "clubs", { enhancement: "bonus" })} decorative />
        </Labelled>
        <Labelled label="Lucky face card (corner clover)">
          <Card card={makeCard(204, "Q", "diamonds", { enhancement: "lucky" })} decorative />
        </Labelled>
      </div>
    </section>
  );
}

function Section1161() {
  const editioned: ReadonlyArray<Joker> = [
    withEdition(jokerById("plus-four-mult"), "foil"),
    withEdition(jokerById("greedy-joker"), "holographic"),
    withEdition(jokerById("banner"), "polychrome"),
    withEdition(jokerById("blackboard"), "negative"),
    jokerById("acrobat"),
  ];
  const withSticker: ReadonlyArray<Joker> = [
    {
      ...withEdition(jokerById("plus-four-mult"), "foil"),
      stickers: [{ kind: "eternal" }],
    },
  ];
  return (
    <section id="preview-1161" className="preview-section">
      <h2>#1161 — Joker edition badges (Foil / Holo / Poly / Neg)</h2>
      <p className="preview-note">Gradient wash kept (proposed):</p>
      <Jokers jokers={editioned} capacity={5} />
      <p className="preview-note">Variant: gradient wash dropped, badge only:</p>
      <div className="preview-no-wash">
        <Jokers jokers={editioned.slice(0, 3)} capacity={3} />
      </div>
      <p className="preview-note">Edition badge sharing the row with an Eternal sticker:</p>
      <Jokers jokers={withSticker} capacity={1} />
    </section>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <main className="preview-page">
    <Section1159 />
    <Section1160 />
    <Section1161 />
  </main>,
);
