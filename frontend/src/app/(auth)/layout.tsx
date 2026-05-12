import { ThemeApplier } from "@/components/layout/ThemeApplier";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeApplier />
      {children}
    </>
  );
}
