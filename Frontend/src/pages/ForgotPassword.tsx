import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getErrorMessage } from '../utils';
import { toast } from 'sonner';

import { Button } from '../components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';

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
      // TODO: Replace with actual backend API call once implemented
      // await api.post('/auth/forgot-password', { email: values.email });
      
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

  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
          <CardDescription>
            {isSubmitted 
              ? "Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder."
              : "Enter your email address and we'll send you a link to reset your password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSubmitted ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="m@example.com" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full mt-4" disabled={isLoading}>
                  {isLoading ? 'Sending reset link...' : 'Send reset link'}
                </Button>
              </form>
            </Form>
          ) : (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => {
                setIsSubmitted(false);
                form.reset();
              }}
            >
              Try another email
            </Button>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t p-4">
          <Link to="/login" className="text-sm font-medium text-primary hover:underline flex items-center gap-2">
            &larr; Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
