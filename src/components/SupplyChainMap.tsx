import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Shipment, Disruption } from '../types';

interface Props {
  shipments: Shipment[];
  disruptions: Disruption[];
  onShipmentClick: (shipment: Shipment) => void;
}

export const SupplyChainMap: React.FC<Props> = ({ shipments, disruptions, onShipmentClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 450;

    svg.selectAll("*").remove();

    const projection = d3.geoMercator()
      .scale(120)
      .translate([width / 2, height / 1.5]);

    const path = d3.geoPath().projection(projection);

    // Draw world map
    const mapGroup = svg.append("g");
    const disruptionGroup = svg.append("g");
    const pathGroup = svg.append("g");

    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
      .then((data: any) => {
        mapGroup.selectAll("path")
          .data(data.features)
          .enter()
          .append("path")
          .attr("d", path)
          .attr("fill", "#1A1A1E")
          .attr("stroke", "#26262B")
          .attr("stroke-width", 0.5);

        // Draw disruptions
        disruptions.forEach(disruption => {
          const [x, y] = projection([disruption.location.lng, disruption.location.lat]) || [0, 0];
          disruptionGroup.append("circle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", disruption.location.radius / 10)
            .attr("fill", disruption.severity === 'high' ? '#EF4444' : '#F59E0B')
            .attr("fill-opacity", 0.1)
            .attr("stroke", disruption.severity === 'high' ? '#EF4444' : '#F59E0B')
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "2,2")
            .append("title")
            .text(disruption.description);
        });

        // Draw shipment paths
        shipments.forEach(shipment => {
          const origin = projection([shipment.origin.lng, shipment.origin.lat]);
          const dest = projection([shipment.destination.lng, shipment.destination.lat]);
          const current = projection([shipment.currentLocation.lng, shipment.currentLocation.lat]);

          if (origin && dest && current) {
            // Full path line
            pathGroup.append("path")
              .attr("d", `M${origin[0]},${origin[1]} Q${(origin[0] + dest[0]) / 2},${Math.min(origin[1], dest[1]) - 50} ${dest[0]},${dest[1]}`)
              .attr("fill", "none")
              .attr("stroke", "#3B82F6")
              .attr("stroke-width", 1)
              .attr("stroke-opacity", 0.1)
              .attr("stroke-dasharray", "4,4");

            // Current position marker
            const marker = pathGroup.append("circle")
              .attr("cx", current[0])
              .attr("cy", current[1])
              .attr("r", 4)
              .attr("fill", shipment.status === 'at-risk' ? '#EF4444' : shipment.status === 'delayed' ? '#F59E0B' : '#10B981')
              .attr("class", "cursor-pointer transition-all hover:stroke-white hover:stroke-2")
              .on("click", () => onShipmentClick(shipment));

            if (shipment.status === 'at-risk') {
              marker.append("animate")
                .attr("attributeName", "r")
                .attr("values", "4;6;4")
                .attr("dur", "1.5s")
                .attr("repeatCount", "indefinite");
            }
          }
        });
      })
      .catch(err => {
        console.error("Map loading error:", err);
        svg.append("text")
          .attr("x", width / 2)
          .attr("y", height / 2)
          .attr("text-anchor", "middle")
          .attr("fill", "white")
          .attr("opacity", 0.5)
          .text("Failed to load global map data");
      });
  }, [shipments, disruptions, onShipmentClick]);

  return (
    <div className="relative glass-panel overflow-hidden bg-black/40">
      <div className="absolute top-4 left-4 z-10">
        <h3 className="font-serif italic text-xs uppercase tracking-widest opacity-60">Global Transit Network</h3>
      </div>
      <svg
        ref={svgRef}
        viewBox="0 0 800 450"
        className="w-full h-auto"
      />
      <div className="scanline" />
    </div>
  );
};
