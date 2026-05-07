"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  wrapperClassName?: string;
  toggleClassName?: string;
  iconClassName?: string;
};

export default function PasswordInput({
  className,
  wrapperClassName,
  toggleClassName,
  iconClassName,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className={cn("relative", wrapperClassName)}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("no-native-password-toggle", className, "pr-12")}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setVisible((current) => !current)}
        className={cn(
          "absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#918B80] transition-all hover:bg-black/5 hover:text-[#2C2A28] focus:outline-none focus:ring-4 focus:ring-[#8C5D3E]/15",
          toggleClassName
        )}
      >
        <Icon className={cn("h-[18px] w-[18px]", iconClassName)} strokeWidth={2.3} />
      </button>
    </div>
  );
}
