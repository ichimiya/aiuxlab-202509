"use client";

import React, { useEffect, useRef } from "react";
import {
  hierarchy,
  linkRadial,
  select,
  tree,
  zoom,
  zoomIdentity,
  type D3ZoomEvent,
  type HierarchyPointLink,
  type HierarchyPointNode,
} from "d3";
import type { MindMapNode } from "@/features/research/utils/mindMap";
import { GlassBox } from "@/shared/ui/GlassBox";

interface ResearchMindMapSectionProps {
  nodes: MindMapNode[];
  onNodeHover?: (node: MindMapNode | null) => void;
}

export function ResearchMindMapSection({
  nodes,
  onNodeHover,
}: ResearchMindMapSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const hoverCallbackRef = useRef(onNodeHover);

  useEffect(() => {
    hoverCallbackRef.current = onNodeHover;
  }, [onNodeHover]);

  useEffect(() => {
    const svgElement = svgRef.current;
    const container = containerRef.current;
    if (!svgElement || !container) {
      return;
    }

    const svg = select(svgElement);
    svg.selectAll("*").remove();

    if (nodes.length === 0) {
      return;
    }

    const containerWidth = Math.max(container.clientWidth, 360);
    const containerHeight = Math.max(container.clientHeight, 360);
    const size = Math.max(containerWidth, containerHeight, 520);
    const radius = Math.max(180, size / 2 - 40);

    svg.attr("viewBox", `${-size / 2} ${-size / 2} ${size} ${size}`);

    const rootData: MindMapNode = {
      id: "root",
      label: "root",
      tagName: "root",
      depth: 0,
      domPath: [],
      children: nodes,
    };

    const root = hierarchy(rootData);

    const layout = tree<MindMapNode>()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.6));
    layout(root);

    const radialPoint = (angle: number, length: number) => {
      const adjusted = angle - Math.PI / 2;
      return [Math.cos(adjusted) * length, Math.sin(adjusted) * length];
    };

    const graphLayer = svg.append("g");

    const linkGenerator = linkRadial<
      HierarchyPointLink<MindMapNode>,
      HierarchyPointNode<MindMapNode>
    >()
      .angle((d) => d.x)
      .radius((d) => d.y);
    const links = root.links() as unknown as HierarchyPointLink<MindMapNode>[];

    graphLayer
      .append("g")
      .attr("fill", "none")
      .attr("stroke", "#64748b")
      .attr("stroke-opacity", 0.45)
      .attr("stroke-width", 1.2)
      .selectAll<SVGPathElement, HierarchyPointLink<MindMapNode>>("path")
      .data(links)
      .join("path")
      .attr("d", (link) => linkGenerator(link));

    const nodeGroup = graphLayer
      .append("g")
      .selectAll<SVGGElement, HierarchyPointNode<MindMapNode>>("g")
      .data(root.descendants().slice(1))
      .join("g")
      .attr("transform", (node) => {
        const [x, y] = radialPoint(node.x ?? 0, node.y ?? 0);
        return `translate(${x}, ${y})`;
      });

    nodeGroup
      .append("circle")
      .attr("r", (node) => getRadiusForDepth(node.depth ?? 0))
      .attr("fill", (node) => getFillForDepth(node.depth ?? 0))
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 1);

    nodeGroup.append("title").text((node) => node.data.label);

    nodeGroup
      .style("cursor", "pointer")
      .on("mouseenter", (_event, node) => {
        hoverCallbackRef.current?.(node.data);
      })
      .on("mouseleave", () => {
        hoverCallbackRef.current?.(null);
      });

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.6, 2.4])
      .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        graphLayer.attr("transform", event.transform.toString());
      });

    svg.call(zoomBehavior).call(zoomBehavior.transform, zoomIdentity);
  }, [nodes]);

  return (
    <section className="space-y-3" aria-label="レポート構造マインドマップ">
      <GlassBox className="relative w-full overflow-hidden border-white/10 bg-slate-900/30 transition-colors hover:border-blue-300/60">
        {nodes.length === 0 ? (
          <p className="text-xs text-slate-500">
            解析可能なHTML構造がありません。
          </p>
        ) : (
          <div ref={containerRef} className="relative h-[420px] w-full">
            <svg ref={svgRef} className="h-full w-full" role="presentation" />
          </div>
        )}
      </GlassBox>
    </section>
  );
}

function getRadiusForDepth(depth: number) {
  if (depth <= 1) return 18;
  if (depth === 2) return 14;
  if (depth === 3) return 10;
  return 8;
}

function getFillForDepth(depth: number) {
  switch (depth) {
    case 1:
      return "#38bdf8"; // result root
    case 2:
      return "#60a5fa";
    case 3:
      return "#818cf8";
    default:
      return "#a855f7";
  }
}
