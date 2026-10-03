import { useContext, type CSSProperties, type ReactNode } from "react";
import type { Route } from "../types";
import { RouterContext } from "../lib/router";
import { routeToPath } from "../lib/routes";

interface LinkProps {
  route: Route;
  campaignId?: string;
  onNavigate?: () => void;
  className?: string;
  style?: CSSProperties;
  title?: string;
  "aria-current"?: "page";
  children: ReactNode;
}

export function Link({
  route,
  campaignId,
  onNavigate,
  className,
  children,
  ...rest
}: LinkProps) {
  const router = useContext(RouterContext);
  return (
    <a
      {...rest}
      href={routeToPath(route, campaignId ?? router.campaignId)}
      className={className ? `link-reset ${className}` : "link-reset"}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
          return;
        if ((e.target as Element).closest("a") !== e.currentTarget) return;
        e.preventDefault();
        if (onNavigate) onNavigate();
        else router.navigate(route);
      }}
    >
      {children}
    </a>
  );
}
