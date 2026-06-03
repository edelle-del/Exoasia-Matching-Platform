ALTER TABLE public.data_room_access_requests
  ADD COLUMN IF NOT EXISTS requester_email text;
