"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Check, ChevronsUpDown, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Mock categories for front-end demo
const CATEGORIES = [
  {
    id: "1",
    name: "Funny",
    emoji: "😂",
    color: "amber",
    description: "Humorous and witty license plates",
  },
  {
    id: "2",
    name: "Creative",
    emoji: "🎨",
    color: "blue",
    description: "Uniquely designed license plates",
  },
  {
    id: "3",
    name: "Inspirational",
    emoji: "✨",
    color: "purple",
    description: "Uplifting and motivational plates",
  },
  {
    id: "4",
    name: "Sports",
    emoji: "🏈",
    color: "green",
    description: "Sports-related license plates",
  },
  {
    id: "5",
    name: "Geeky",
    emoji: "🤓",
    color: "red",
    description: "Tech and pop culture references",
  },
];

// Form schema for validation
const formSchema = z.object({
  plateNumber: z.string().min(2, {
    message: "License plate number must be at least 2 characters.",
  }),
  country: z.string().min(2, {
    message: "Country must be at least 2 characters.",
  }),
  carMake: z.string().min(1, {
    message: "Car make is required.",
  }),
  categoryId: z.string({
    required_error: "Please select a category.",
  }),
  images: z
    .array(z.instanceof(File))
    .min(1, { message: "At least one image is required." })
    .max(5, { message: "Maximum 5 images allowed." }),
});

export default function SubmitPlateForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [previewUrls, setPreviewUrls] = React.useState<string[]>([]);

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      plateNumber: "",
      country: "",
      carMake: "",
      categoryId: "",
      images: [],
    },
  });

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length > 0) {
      // Update form value
      form.setValue("images", files, { shouldValidate: true });

      // Create preview URLs
      const newPreviewUrls = files.map((file) => URL.createObjectURL(file));

      // Clean up previous preview URLs to avoid memory leaks
      previewUrls.forEach((url) => URL.revokeObjectURL(url));

      // Set new preview URLs
      setPreviewUrls(newPreviewUrls);
    }
  };

  // Form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      // This is where you would normally handle the actual form submission
      // For demo purposes, we'll just simulate a submission
      console.log("Form values:", values);

      toast.success("License plate submitted successfully!");
      // In a real implementation, this would redirect after successful submission
      // router.push("/");
    } catch (error) {
      toast.error("Failed to submit license plate.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* License Plate Number */}
          <FormField
            control={form.control}
            name="plateNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>License Plate Number</FormLabel>
                <FormControl>
                  <Input placeholder="ABC123" {...field} />
                </FormControl>
                <FormDescription>
                  Enter the license plate number.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Country */}
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input placeholder="USA" {...field} />
                </FormControl>
                <FormDescription>
                  Enter the country of the license plate.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Car Make */}
          <FormField
            control={form.control}
            name="carMake"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Car Make</FormLabel>
                <FormControl>
                  <Input placeholder="Toyota" {...field} />
                </FormControl>
                <FormDescription>Enter the make of the car.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Category Combobox */}
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Category</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value
                          ? CATEGORIES.find(
                              (category) => category.id === field.value
                            )?.name
                          : "Select category"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search category..." />
                      <CommandList>
                        <CommandEmpty>No category found.</CommandEmpty>
                        <CommandGroup>
                          {CATEGORIES.map((category) => (
                            <CommandItem
                              value={category.name}
                              key={category.id}
                              onSelect={() => {
                                form.setValue("categoryId", category.id);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  category.id === field.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <span className="mr-2">{category.emoji}</span>
                              {category.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Select a category for the license plate.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Image Upload */}
        <FormField
          control={form.control}
          name="images"
          render={({ field: { onChange, value, ...rest } }) => (
            <FormItem>
              <FormLabel>Upload Images</FormLabel>
              <FormControl>
                <div className="flex flex-col items-center space-y-4">
                  <div className="grid w-full gap-4">
                    <div className="flex h-40 w-full flex-col items-center justify-center rounded-md border border-dashed p-4">
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Drag & drop or click to upload license plate photos
                      </p>
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        className="mt-4 w-full max-w-xs"
                        onChange={handleFileChange}
                        {...rest}
                      />
                    </div>

                    {/* Image Previews */}
                    {previewUrls.length > 0 && (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                        {previewUrls.map((url, index) => (
                          <div key={index} className="relative aspect-square">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="h-full w-full rounded-md object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </FormControl>
              <FormDescription>
                Upload up to 5 photos of the license plate.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "Submit License Plate"}
        </Button>
      </form>
    </Form>
  );
}
