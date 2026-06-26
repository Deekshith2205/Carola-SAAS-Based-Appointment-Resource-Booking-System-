import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MailCheck, ArrowLeft } from 'lucide-react';
import { getErrorMessage } from '../utils';
import { toast } from 'sonner';

import { Button } from '../components/ui/button';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '../components/ui/form';
import { Input } from '../components/ui/input';
import { LoadingSpinner } from '../components/common';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async () => {
    setIsLoading(true);
    try {
      // Simulate network request
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      toast.success('Reset link sent! Please check your email.');
      setIsSubmitted(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-6 shadow-sm">
          <MailCheck size={40} strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Check your email</h1>
        <p className="text-muted-foreground mt-3 max-w-sm mx-auto leading-relaxed">
          We sent a password reset link to <span className="font-medium text-foreground">{form.getValues('email')}</span>
        </p>
        <Button 
          variant="outline" 
          className="mt-8 w-full h-11 text-base font-medium" 
          onClick={() => {
            setIsSubmitted(false);
            form.reset();
          }}
        >
          Try another email
        </Button>
        <div className="mt-8">
          <Link to="/login" className="text-sm font-medium text-primary hover:underline underline-offset-4 flex items-center justify-center gap-2">
            <ArrowLeft size={14} /> Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center lg:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Reset password</h1>
        <p className="text-muted-foreground mt-2">Enter your email address and we'll send you a link to reset your password.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input placeholder="name@example.com" {...field} disabled={isLoading} autoFocus />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button type="submit" className="w-full h-11 text-base font-medium mt-2" disabled={isLoading}>
            {isLoading ? <LoadingSpinner size="sm" className="text-primary-foreground border-t-white" /> : 'Send reset link'}
          </Button>
        </form>
      </Form>

      <div className="mt-8 text-center">
        <Link to="/login" className="text-sm font-medium text-primary hover:underline underline-offset-4 flex items-center justify-center gap-2 lg:justify-start">
          <ArrowLeft size={14} /> Back to login
        </Link>
      </div>
    </div>
  );
}
