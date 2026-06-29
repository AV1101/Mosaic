def inject_tokens(prompt: str, tokens: dict) -> str:
    """
    Inject design tokens into prompt template.
    Supports both:
    - Simple format: {{PRIMARY_COLOR}} -> tokens["PRIMARY_COLOR"]
    - Nested format: {{colors.primary}} -> tokens["colors"]["primary"]
    """
    output = prompt
    
    # Handle simple format: {{PRIMARY_COLOR}}
    for key, value in tokens.items():
        if isinstance(value, dict):
            # Handle nested tokens in the dict
            for sub_key, sub_value in value.items():
                output = output.replace(f"{{{{{sub_key}}}}}", str(sub_value))
        else:
            # Direct replacement for simple keys
            output = output.replace(f"{{{{{key}}}}}", str(value))
    
    # Also handle nested format: {{colors.primary}}
    for category, values in tokens.items():
        if isinstance(values, dict):
            for key, value in values.items():
                output = output.replace(f"{{{{{category}.{key}}}}}", str(value))
    
    return output
