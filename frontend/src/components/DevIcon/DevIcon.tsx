import type { ComponentType } from "react";
import type { DeveloperIconProps } from "developer-icons/dist/icon";
import "./DevIcon.css";

interface Props extends DeveloperIconProps {
  Icon: ComponentType<DeveloperIconProps>;
  label?: string;
  variant?: "default" | "card" | "inline";
}

/**
 * Wrapper around developer-icons that matches the app's neo-brutalist design.
 *
 * Usage:
 *   import { React } from "developer-icons/dist/icons/React";
 *   <DevIcon Icon={React} size={32} label="React" variant="card" />
 *   <DevIcon Icon={Docker} size={20} variant="inline" />
 */
export default function DevIcon({ Icon, label, variant = "default", size = 24, className = "", ...rest }: Props) {
  const classes = [
    "dev-icon",
    `dev-icon--${variant}`,
    className,
  ].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <Icon size={size} {...rest} />
      {label && <span className="dev-icon-label">{label}</span>}
    </div>
  );
}
