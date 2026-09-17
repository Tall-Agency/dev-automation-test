# Freshdesk Path 2 bootstrap (Express Bi-Folds)

Copy the contents of this folder into the root of `Tall-Agency/expressbifolds.co.uk` after GitHub migrate (merge with existing Bedrock tree).

```bash
# From expressbifolds.co.uk repo root:
cp -r path/to/client-bootstrap/expressbifolds.co.uk/.cursor ./
cp -r path/to/client-bootstrap/expressbifolds.co.uk/scripts/freshdesk ./scripts/
mkdir -p scripts/bugherd
cp path/to/client-bootstrap/expressbifolds.co.uk/scripts/bugherd/* ./scripts/bugherd/
cp path/to/client-bootstrap/expressbifolds.co.uk/scripts/deployhq-build.sh ./scripts/
chmod +x scripts/deployhq-build.sh scripts/freshdesk/worker-action.sh
```

Then add `Tall-Agency/expressbifolds.co.uk` to the shared Cursor multi-repo Freshdesk environment.
