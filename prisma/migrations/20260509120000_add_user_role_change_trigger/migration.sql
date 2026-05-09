CREATE OR REPLACE FUNCTION public.notify_user_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO "RoleChangeEvent" ("id", "targetUserId", "actorId", "action")
  VALUES (gen_random_uuid()::text, NEW."id", NULL, 'user.role.updated');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "User_role_change_event_trigger" ON "User";

CREATE TRIGGER "User_role_change_event_trigger"
AFTER UPDATE OF "role" ON "User"
FOR EACH ROW
WHEN (OLD."role" IS DISTINCT FROM NEW."role")
EXECUTE FUNCTION public.notify_user_role_change();
