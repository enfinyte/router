"use client";

import * as React from "react";
import {
  IconBrandGithub,
  IconDashboard,
  IconKey,
  IconPlug,
} from "@tabler/icons-react";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import Image from "next/image";
import { GITHUB_URL } from "@/lib/consts";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: IconDashboard,
    },
    {
      title: "Connections",
      url: "/connections",
      icon: IconPlug,
    },
    {
      title: "API Keys",
      url: "/api-keys",
      icon: IconKey,
    },
  ],
  navSecondary: [
    {
      title: "Github",
      url: GITHUB_URL,
      isExternal: true,
      icon: IconBrandGithub,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <Link href="/">
                <Image
                  src={"/logo-transparent.svg"}
                  className="size-10!"
                  alt={""}
                  width={100}
                  height={100}
                />
                <span className="text-base font-semibold">Enfinyte</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
