"use client";

import { type ReactNode, useState } from "react";
import {
  Camera,
  FileBox,
  FileText,
  LayoutDashboard,
  MapPinned,
  MessageSquare,
  Plane,
  Receipt,
  Ruler,
  Stamp,
  TrendingUp,
  History,
  type LucideIcon,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export interface ProjectTabDef {
  value: string;
  label: string;
}

const ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  kajian: FileText,
  simbg: FileBox,
  survey: MapPinned,
  drone: Plane,
  images: Camera,
  area: Ruler,
  progress: TrendingUp,
  timeline: History,
  invoice: Receipt,
  approval: Stamp,
  discussion: MessageSquare,
};

export function ProjectTabs({
  tabs,
  content,
  defaultTab,
}: {
  tabs: ProjectTabDef[];
  content: Record<string, ReactNode>;
  defaultTab: string;
}) {
  const initial = tabs.some((t) => t.value === defaultTab)
    ? defaultTab
    : tabs[0]?.value;
  const [value, setValue] = useState(initial);

  return (
    <Tabs value={value} onValueChange={setValue} className="w-full">
      <ScrollArea className="w-full whitespace-nowrap">
        <TabsList className="inline-flex h-auto w-max gap-1 bg-transparent p-0">
          {tabs.map((t) => {
            const Icon = ICONS[t.value] ?? FileText;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="rounded-lg border border-transparent px-3 py-2 data-[state=active]:border-border data-[state=active]:bg-card"
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value} className="mt-6">
          {content[t.value]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
