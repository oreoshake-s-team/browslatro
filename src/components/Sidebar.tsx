import type { Blind } from "../types";
import { BlindValues } from "../constants";
import Round from "./Round";
import HandScore from "./HandScore";
import RunInfo from "./RunInfo";
import Options from "./Options";
import RoundProgress from "./RoundProgress";
import RunProgress from "./RunProgress";

interface SidebarProps {
  blind: Blind;
  ante: number;
  round: number;
  money: number;
  handleReset: () => void;
}

export default function Sidebar({ blind, ante, round, money, handleReset }: SidebarProps) {
  return (
    <div className="sidebar">
      <Round blind={blind} ante={ante} BlindValues={BlindValues} />
      <HandScore />
      <div className="sub-info-progress">
        <div className="sub-info">
          <RunInfo />
          <Options onReset={handleReset} />
        </div>
        <div className="progress">
          <RoundProgress />
          <RunProgress ante={ante} round={round} money={money} />
        </div>
      </div>
    </div>
  );
}