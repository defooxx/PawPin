import { MapPin, Navigation, X } from "lucide-react";
import { createPortal } from "react-dom";

export function LocationChoiceDialog({ open, onClose, onChoose }) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="pp-consent-backdrop" role="presentation" onClick={onClose}>
      <div className="pp-consent" role="dialog" aria-modal="true" aria-labelledby="location-choice-title" onClick={(event) => event.stopPropagation()}>
        <button className="pp-icobtn pp-consent-close" aria-label="Close location choices" onClick={onClose}><X size={17} /></button>
        <div className="pp-avatar"><MapPin size={27} /></div>
        <h2 className="pp-h2" id="location-choice-title">Use your current location?</h2>
        <p className="pp-sub">PawPin only shares it while you choose. Continuous sharing stops when you leave this screen.</p>
        <button className="pp-btn pp-btn-amber" onClick={() => onChoose("once")}><MapPin size={17} />Allow once</button>
        <button className="pp-btn pp-btn-ghost" onClick={() => onChoose("share")}><Navigation size={17} />Keep sharing while open</button>
      </div>
    </div>,
    document.body,
  );
}
