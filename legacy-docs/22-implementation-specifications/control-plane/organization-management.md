# Organization Management

Core entities:

```text
Organization
User
Membership
Role
```

Operations:

```text
create organization
invite member
change role
remove member
list members
```

Every mutation must be authorized and audited.

Future enterprise capabilities such as SCIM should fit behind this boundary without redesigning the core model.
