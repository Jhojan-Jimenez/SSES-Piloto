import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { X } from "lucide-react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white border border-[#e1e1e1] rounded-lg",
        className
      )}
    >
      {children}
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed";
  const sizes = {
    sm: "text-xs px-2.5 py-1.5",
    md: "text-sm px-3.5 py-2",
  };
  const variants = {
    primary: "bg-[#000000] text-white hover:bg-[#1f1f1f]",
    secondary: "bg-[#ebebeb] text-[#000000] hover:bg-[#e1e1e1] border border-[#e1e1e1]",
    ghost: "bg-transparent text-[#434343] hover:bg-[#e9e9e9]",
    danger: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
  };

  return (
    <button
      className={cn(base, sizes[size], variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: "neutral" | "ocean" | "success" | "warning" | "danger";
  className?: string;
}) {
  const variants = {
    neutral: "bg-[#ebebeb] text-[#434343] border-[#e1e1e1]",
    ocean: "bg-[#001923] text-white border-[#001923]",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    danger: "bg-red-50 text-red-800 border-red-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full bg-white border border-[#e1e1e1] rounded-md px-3 py-2 text-sm text-[#000000] placeholder:text-[#939393] focus:outline-none focus:border-[#000000]",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full bg-white border border-[#e1e1e1] rounded-md px-3 py-2 text-sm text-[#000000] focus:outline-none focus:border-[#000000]",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full bg-white border border-[#e1e1e1] rounded-md px-3 py-2 text-sm text-[#000000] placeholder:text-[#939393] focus:outline-none focus:border-[#000000]",
        className
      )}
      {...props}
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={cn(
          "w-full bg-white border border-[#e1e1e1] rounded-lg overflow-hidden max-h-[90vh] flex flex-col",
          maxWidth
        )}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#e1e1e1]">
          <div>
            <h3 className="text-base font-semibold text-[#000000]">{title}</h3>
            {subtitle && (
              <p className="text-xs text-[#6c6c6c] mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#ebebeb] text-[#6c6c6c] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
