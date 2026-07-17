# Authorize SSH deploy key on the Raspberry Pi

This project uses a dedicated deploy key (separate from other Pi projects).

## Public key

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMqsKwBjomU3hSq3AGg7qI6VKHSdkqj9wU6G/0GhZae4 zenith-frontier-pi-deploy
```

## Add to the Pi (`pi` user)

1. SSH in (password or an existing key):

```bash
ssh pi@<PI_IP>
```

2. Append the public key to `authorized_keys`:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMqsKwBjomU3hSq3AGg7qI6VKHSdkqj9wU6G/0GhZae4 zenith-frontier-pi-deploy' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

3. From your deploy machine, test with the matching private key:

```bash
ssh -i /path/to/zenith-frontier-pi-deploy pi@<PI_IP>
```

## Notes

- Keep this key scoped to Zenith Frontier Pi deploy only.
- Install path on the Pi: `/home/pi/zenith-frontier-pi` (see README and systemd unit).
- Do not reuse keys from other projects on the same Pi.
