'use client'

import { useSession } from "@clerk/nextjs";
import { useState, createContext, useEffect, useContext } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type SupabaseContext = {
    supabase: SupabaseClient | null,
    isLoaded: boolean
}

const Context = createContext<SupabaseContext>({
    supabase: null,
    isLoaded: false
});

type Props= {
    children: React.ReactNode;
}

export default function SupabaseProvider({ children }: Props) {
    const { session } = useSession();
    const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
    const [isLoaded, setIsLoaded] = useState(false);


    useEffect(() => {
        // Wait for session to be available before initializing Supabase
          console.log("Session:", session); // Add this log to check if session is available
          

        if (!session) {
            return; // Exit if session is not yet available
        }

        // Create a single supabase client for interacting with your database
        const client = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
                accessToken: () => session?.getToken()
            }
        );

        setSupabase(client);

        console.log("Supabase client initialized:", client); // Add this log to check if client is created
        setIsLoaded(true);
    }, [session]);

    return (
        <Context.Provider value={{ supabase, isLoaded }}>
            {!isLoaded ? <div>...Loading</div> : children}
        </Context.Provider>
    );
}

export const useSupabase = () => {
    const context = useContext(Context)
    if (context === undefined) {
      throw new Error('useSupabase must be used within a SupabaseProvider')
    }
    return { 
      supabase: context.supabase,
      isLoaded: context.isLoaded
    }
  }