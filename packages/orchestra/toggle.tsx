import { type HTMLAttributes, type RefObject, useEffect, useState } from "react";
import Orchestra from "./orchestra";
import s from "./toggle.module.css";

type OrchestraToggleProps = Omit<
  HTMLAttributes<HTMLButtonElement>,
  "id" | "children" | "defaultValue"
> & {
  children: string;
  id: string;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  defaultValue?: boolean;
};

export function OrchestraToggle({
  id,
  children,
  buttonRef: _buttonRef,
  defaultValue,
  className: _className,
  ...props
}: OrchestraToggleProps) {
  useEffect(() => {
    Orchestra.setState((state) => ({ [id]: defaultValue ?? state[id] }));
  }, [defaultValue, id]);

  const [active, setActive] = useState(defaultValue ?? Orchestra.getState()[id]);

  useEffect(() => {
    const unsubscribe = Orchestra.subscribe(
      ({ [id]: value }) => value,
      (value) => {
        setActive(value);
      },
      {
        fireImmediately: true,
      },
    );
    return unsubscribe;
  }, [id]);

  return (
    <button
      type="button"
      {...props}
      onClick={() => {
        Orchestra.setState((state) => ({ [id]: !state[id] }));
      }}
      className={active ? `${s.toggle} ${s.active}` : s.toggle}
      title={id}
    >
      {children}
    </button>
  );
}
