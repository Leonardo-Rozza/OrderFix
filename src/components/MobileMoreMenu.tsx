import { Link, useLocation } from 'react-router';
import { isNavItemActive, type NavItem } from '../config/nav';
import { Modal } from './Modal';

interface MobileMoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: readonly NavItem[];
}

/** Bandeja secundaria de herramientas para viewports donde el sidebar no existe. */
export const MobileMoreMenu = ({ isOpen, onClose, items }: MobileMoreMenuProps) => {
  const { pathname } = useLocation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Más herramientas" size="sm" bodyClassName="pt-3">
      <p className="mb-3 text-[13px] leading-relaxed text-text-2">
        Accedé a las demás secciones habilitadas para tu taller.
      </p>
      <nav aria-label="Más secciones" className="grid grid-cols-2 gap-2.5">
        {items.map((item) => {
          const current = isNavItemActive(item, pathname);
          return (
            <Link
              key={item.key}
              to={item.path}
              onClick={onClose}
              aria-current={current ? 'page' : undefined}
              className={`flex min-h-[76px] min-w-0 touch-manipulation flex-col items-start justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] ${
                current
                  ? 'border-primary bg-primary-soft text-primary-soft-fg'
                  : 'border-border bg-surface-2 text-text hover:border-border-strong hover:bg-surface-3'
              }`}
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface text-text-2 shadow-sm">
                {item.icon}
              </span>
              <span className="truncate text-[13.5px] font-extrabold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </Modal>
  );
};
