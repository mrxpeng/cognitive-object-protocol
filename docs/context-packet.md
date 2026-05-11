# Context Packets

A context packet is a task-specific model input bundle.

Instead of sending an entire long document to a model, COP can send:

- the target block;
- related evidence;
- related risks;
- human comments;
- validation constraints;
- expected operation format.

This improves model focus, reduces token cost, and makes outputs easier to validate.
