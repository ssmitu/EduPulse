UPDATE [dbo].[Users]
SET 
    [Email] = 'admin@edupulse.com',
    [Role] = 0, -- 0 for Admin
    [IsVerified] = 1, -- Ensure the account is verified
    [CurrentSemester] = NULL,
    -- This is a REAL BCrypt hash for the password "admin123"
    [PasswordHash] = '$2a$11$N9qo8uLOickgx2ZMRZoMyeIjZAgNIvUYOv9WdI6G33VAtZ0.v3i1G'
WHERE [Id] = 9;