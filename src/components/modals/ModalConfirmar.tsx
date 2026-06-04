import { AlertTriangle, X } from "lucide-react";

interface Props {
  titulo: string;
  mensaje: string;
  labelConfirmar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export default function ModalConfirmar({
  titulo,
  mensaje,
  labelConfirmar = "Eliminar",
  onConfirmar,
  onCancelar,
}: Props) {
  return (
    <div className="mconf-overlay" onClick={onCancelar}>
      <div className="mconf-box" onClick={(e) => e.stopPropagation()}>

        <div className="mconf-header">
          <div className="mconf-icon-wrap">
            <AlertTriangle size={22} />
          </div>
          <button className="mconf-close" onClick={onCancelar}>
            <X size={18} />
          </button>
        </div>

        <div className="mconf-body">
          <p className="mconf-titulo">{titulo}</p>
          <p className="mconf-mensaje">{mensaje}</p>
        </div>

        <div className="mconf-footer">
          <button className="mconf-btn-cancel" onClick={onCancelar}>
            Cancelar
          </button>
          <button className="mconf-btn-confirm" onClick={onConfirmar}>
            {labelConfirmar}
          </button>
        </div>

      </div>
    </div>
  );
}