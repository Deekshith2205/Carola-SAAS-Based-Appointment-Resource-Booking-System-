import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted/50 text-muted-foreground shadow-sm">
        <FileQuestion size={48} strokeWidth={1.5} />
      </div>
      
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">404</h1>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Page Not Found</h2>
      
      <p className="mt-4 max-w-md text-base text-muted-foreground leading-relaxed">
        We can't seem to find the page you're looking for. It might have been removed, had its name changed, or is temporarily unavailable.
      </p>

      <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
        <Button 
          variant="outline" 
          size="lg"
          onClick={() => navigate(-1)} 
          className="w-full sm:w-auto gap-2"
        >
          <ArrowLeft size={18} />
          Go Back
        </Button>
        <Button 
          size="lg"
          onClick={() => navigate('/')} 
          className="w-full sm:w-auto gap-2"
        >
          <Home size={18} />
          Return Home
        </Button>
      </div>
    </div>
  );
}
