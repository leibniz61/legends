-- Fix the profile creation trigger
-- The SECURITY DEFINER runs as the function owner, but we need to ensure
-- the function owner (postgres) has the right permissions and the function
-- doesn't fail due to RLS or other issues.

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate the function with proper error handling and set search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)),
    now()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Username already exists, generate a unique one
    INSERT INTO public.profiles (id, username, created_at)
    VALUES (
      NEW.id,
      'user_' || LEFT(NEW.id::text, 8),
      now()
    );
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
