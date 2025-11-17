-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- Allow users to insert their own profile (for registration)
CREATE POLICY "Users can insert own profile"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = auth_user_id);