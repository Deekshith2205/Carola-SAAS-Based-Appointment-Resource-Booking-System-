import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <h1 className="text-4xl font-bold text-destructive mb-4">403 - Unauthorized</h1>
      <p className="text-muted-foreground mb-8">You do not have permission to view this page.</p>
      <button 
        onClick={() => navigate('/')} 
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Return Home
      </button>
    </div>
  );
}
