"use client";
import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Button } from "@/components/ui/button";
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';

// Import Supabase provider and Clerk user context
import { useSupabase } from "@/lib/supabase-provider";
import { useUser } from "@clerk/nextjs";

// Type definitions for Mermaid component props
type MermaidProps = {
  chart: string;
  id: string;
};

type ChartData = {
  content: string;
};

export default function Home() {
  // State for editor code (initial Mermaid graph)
  const [code, setCode] = useState(`graph TD`);

  // State for the rendered chart (to update when user clicks 'Run')
  const [rendered, setRendered] = useState(code);

  // State to store saved charts from Supabase
  const [savedCharts, setSavedCharts] = useState<string[]>([]);

  // State to manage modal visibility for the selected chart
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedChart, setSelectedChart] = useState<string | null>(null);

  // Supabase client and user context
  const { supabase } = useSupabase();
  const { user } = useUser();

  // Function to fetch saved charts from Supabase
  const fetchCharts = async () => {
    // Exit if Supabase or user is not available
    // This prevents unnecessary API calls when the user is not logged in or Supabase is not initialized
    if (!supabase || !user) return;

    // Fetch chart data from the Supabase 'charts' table
    const { data, error } = await supabase
      .from('charts')
      .select('content')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching charts:', error);
      return;
    }

    // Update saved charts state with the fetched chart contents
    if (data) {
      // Only map the content field into the array
      setSavedCharts(data.map((item: ChartData) => item.content.trim()));
    }
  }

  // Function to save the current chart to Supabase
  const handleSave = async () => {
    if (!supabase || !user) {
      console.warn('Supabase or user not ready!');
      return;
    }

    // Validate the Mermaid syntax before saving
    try {
      await mermaid.parse(code); // Throws error if invalid Mermaid code
    } catch (err) {
      console.warn('Invalid Mermaid syntax:', err);
      return; // Prevent saving
    }

    // Save the current chart to Supabase database
    const { data, error } = await supabase
      .from('charts')
      .insert([
        { 
          content: code,
          user_id: user.id,
        }
      ])
      .select()

    if (error) {
      console.error('Error saving chart:', error);
      return;
    } else {
      console.log('Chart saved:', data);

      // Optimistically update the savedCharts state with the new chart
    setSavedCharts((prev) => [code.trim(), ...prev]);
    }
  };

  // Fetch saved charts from Supabase once user is available
  useEffect(() => {
    fetchCharts();
  }, [supabase, user])

  return (
    <div className="max-w-7xl mx-auto mt-10 px-4">
      {/* Main content wrapper */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Markdown editor with Mermaid syntax */}
        <div className="border rounded-md overflow-hidden flex-1">
          <CodeMirror
            value={code}
            height="500px"
            extensions={[markdown()]}
            onChange={(value) => setCode(value)}
            theme="dark"
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
            }}
          />
        </div>
        {/* Action buttons to run/save the chart */}
        <div className="flex flex-col gap-2">
          <Button onClick={() => setRendered(code.trim())}>Run</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>

        {/* Live preview of rendered Mermaid chart */}
        <div className="border rounded-md p-4 bg-white flex-1 overflow-auto">
          <Mermaid chart={rendered} id="live-preview"/>
        </div>
      </div>

      {/* Section to display previously saved charts */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4">Saved Charts</h2>
        {savedCharts.length === 0 ? (
          <p className="text-gray-500">No charts saved yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          { savedCharts.map((chart, index) => (
            <div
              key={index}
              className="border rounded-md p-4 bg-white cursor-pointer hover:shadow-lg transition"
              onClick={() => {
                setSelectedChart(chart);
                setModalOpen(true);
              }}
            >
              {/* Display Mermaid chart with a limited height */}
              <div className="max-h-[200px] overflow-auto">
              <Mermaid chart={chart} id={`saved-chart-${index}`} />
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Modal to display selected chart in full screen */}
      {modalOpen && selectedChart && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black"
            >
              ✕
            </button>
            <div className="overflow-auto max-h-[80vh]">
              <Mermaid chart={selectedChart} id="modal-preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Initialize Mermaid once at the module level
if (typeof window !== 'undefined') {
  mermaid.initialize({ startOnLoad: false });
  console.log( "Mermaid initialized");
}

// Mermaid component to render SVG diagrams based on the chart string
function Mermaid({ chart, id }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log(`Rendering Mermaid chart [${id}]`, chart);
    if (!ref.current) return;

    // Clear any existing content before rendering the new chart
    ref.current.innerHTML = "";

    // Function to render the Mermaid chart
    const renderChart = async () => {
      try {
        // Render the chart asynchronously
        setTimeout(async () => {
        // Render the diagram and inject SVG into the DOM
        const { svg } = await mermaid.render(`mermaid-${id}`, chart);
        if (ref.current) {
          ref.current.innerHTML = svg; // Inject the generated SVG into the DOM
        }
      }, 0);
      } catch (err) {
        // Handle any errors during rendering
        console.error("Mermaid render error:", err);
        if (ref.current) {
          ref.current.innerHTML = `<div class="text-red-500">Error rendering chart</div>`;
        }
      }
    };

    renderChart();
  }, [chart, id]);

  return <div ref={ref} />
}
