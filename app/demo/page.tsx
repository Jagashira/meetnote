import type { Metadata } from "next";
import { PublicDemoWorkspace } from "@/components/PublicDemoWorkspace";

export const metadata: Metadata = {
  title: "30秒文字起こしデモ | MinuteDock",
  description: "MinuteDockの30秒文字起こし公開デモ",
};

export default function DemoPage() {
  return <PublicDemoWorkspace />;
}
