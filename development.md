Make changes via the GitHub standard.
Ensure you have GitHub CLI installed.

```sh
# pull latest changes
git checkout mainline
git pull

# make new branch
git checkout -b feature/my-change

# now start coding
I KNOW WHAT I AM DOING

# stage, commit, push your local changes
git add .
git commit -m "Add MUBox cognito token revocation endpoint"
git push -u origin feature/my-change

# use gh cli to create a new pr
gh pr create --fill
```