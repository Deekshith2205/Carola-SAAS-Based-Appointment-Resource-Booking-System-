import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Briefcase, User as UserIcon, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { getErrorMessage } from '../utils';
import { toast } from 'sonner';
import { getDefaultRouteForRole } from '../utils/routeUtils';

import { Button } from '../components/ui/button';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '../components/ui/form';
import { Input } from '../components/ui/input';
import { LoadingSpinner } from '../components/common';
import { cn } from '../lib/utils';

const registerSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter.' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number.' }),
  confirmPassword: z.string(),
  role: z.enum(['CUSTOMER', 'BUSINESS_OWNER']),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

// Password strength calculator
const getStrength = (password: string) => {
  let score = 0;
  if (!password) return score;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score; // 0 to 4
};

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'CUSTOMER',
    },
  });

  const pwdValue = form.watch('password');
  const strength = getStrength(pwdValue);

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    try {
      const { token, user } = await authService.register({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
      });
      login(token, user);
      toast.success('Registration successful! Welcome to the platform.');
      
      const from = getDefaultRouteForRole(user.role);
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center lg:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Create an account</h1>
        <p className="text-muted-foreground mt-2">Sign up to start booking or managing your business</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>I want to...</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 gap-4">
                    <label
                      className={cn(
                        "relative flex cursor-pointer flex-col items-center justify-between rounded-xl border-2 p-4 text-center transition-all hover:bg-accent",
                        field.value === 'CUSTOMER' ? "border-primary bg-primary/5" : "border-muted bg-transparent"
                      )}
                    >
                      <input
                        type="radio"
                        name={field.name}
                        value="CUSTOMER"
                        checked={field.value === 'CUSTOMER'}
                        onChange={() => field.onChange('CUSTOMER')}
                        className="sr-only"
                      />
                      <UserIcon className={cn("mb-3 h-6 w-6", field.value === 'CUSTOMER' ? "text-primary" : "text-muted-foreground")} />
                      <span className={cn("text-sm font-semibold", field.value === 'CUSTOMER' ? "text-foreground" : "text-muted-foreground")}>
                        Book Appointments
                      </span>
                      {field.value === 'CUSTOMER' && (
                        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check size={12} />
                        </div>
                      )}
                    </label>

                    <label
                      className={cn(
                        "relative flex cursor-pointer flex-col items-center justify-between rounded-xl border-2 p-4 text-center transition-all hover:bg-accent",
                        field.value === 'BUSINESS_OWNER' ? "border-primary bg-primary/5" : "border-muted bg-transparent"
                      )}
                    >
                      <input
                        type="radio"
                        name={field.name}
                        value="BUSINESS_OWNER"
                        checked={field.value === 'BUSINESS_OWNER'}
                        onChange={() => field.onChange('BUSINESS_OWNER')}
                        className="sr-only"
                      />
                      <Briefcase className={cn("mb-3 h-6 w-6", field.value === 'BUSINESS_OWNER' ? "text-primary" : "text-muted-foreground")} />
                      <span className={cn("text-sm font-semibold", field.value === 'BUSINESS_OWNER' ? "text-foreground" : "text-muted-foreground")}>
                        Manage Business
                      </span>
                      {field.value === 'BUSINESS_OWNER' && (
                        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check size={12} />
                        </div>
                      )}
                    </label>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input placeholder="name@example.com" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        {...field} 
                        disabled={isLoading} 
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </FormControl>
                  {/* Strength Meter */}
                  {pwdValue.length > 0 && (
                    <div className="mt-2 flex h-1.5 w-full gap-1 overflow-hidden rounded-full">
                      <div className={cn("h-full flex-1 transition-all", strength >= 1 ? "bg-rose-500" : "bg-muted")} />
                      <div className={cn("h-full flex-1 transition-all", strength >= 2 ? "bg-amber-500" : "bg-muted")} />
                      <div className={cn("h-full flex-1 transition-all", strength >= 3 ? "bg-emerald-500" : "bg-muted")} />
                      <div className={cn("h-full flex-1 transition-all", strength >= 4 ? "bg-emerald-600" : "bg-muted")} />
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showConfirm ? "text" : "password"} 
                        {...field} 
                        disabled={isLoading} 
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none"
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" className="w-full h-11 text-base font-medium mt-2" disabled={isLoading}>
            {isLoading ? <LoadingSpinner size="sm" className="text-primary-foreground border-t-white" /> : 'Create account'}
          </Button>
        </form>
      </Form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
