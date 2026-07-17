# One-time: authorize this PC to SSH into the Pi
# Run these commands ON the Raspberry Pi (keyboard/monitor, or any existing SSH session).

mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMqsKwBjomU3hSq3AGg7qI6VKHSdkqj9wU6G/0GhZae4 zenith-frontier-pi-deploy' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Then from Windows (this PC), deploy:
#   powershell -File pi-server/deploy/push-to-pi.ps1
