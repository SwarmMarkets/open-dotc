import json
import os
import sys

# Validate 'name' field (must exist and be <= 20 characters)
def validate_name(data, file):
    name = data.get("name", "")
    if len(name) > 20:
        print(f"::error file={file}::'name' exceeds 20 characters.")
        return False
    else:
        print(f"::notice file={file}::name check passed ✅")
        return True

# Validate 'description' field (if it exists, it must be <= 100 characters)
def validate_description(data, file):
    description = data.get("description", None)  # Ensure None check
    if description is not None and len(description) > 100:
        print(f"::error file={file}::'description' exceeds 100 characters.")
        return False
    else:
        print(f"::notice file={file}::description check passed ✅")
        return True

# Validate 'address' field under all keys (must be <= 42 characters)
def validate_address(data, file):
    addresses = data.get("address", {})
    valid = True

    for network, address in addresses.items():
        if len(address) > 42:
            print(f"::error file={file}::'address.{network}' exceeds 42 characters.")
            valid = False
        else:
            print(f"::notice file={file}::address.{network} check passed ✅")
    
    return valid

# Function to validate the entire JSON file
def validate_json(file):
    with open(file, 'r') as f:
        data = json.load(f)
        
    name_valid = validate_name(data, file)
    description_valid = validate_description(data, file)
    address_valid = validate_address(data, file)

    # Return overall success or failure
    return name_valid and description_valid and address_valid

# Main function to validate all JSON files in the 'authorizations' and 'price-feeds' folders
def main():
    folders = ["authorizations/", "price-feeds/"]
    
    all_valid = True
    for folder in folders:
        files = [f for f in os.listdir(folder) if f.endswith('.json')]
        for json_file in files:
            file_path = os.path.join(folder, json_file)
            if not validate_json(file_path):
                all_valid = False

    if not all_valid:
        sys.exit(1)  # Exit with error if any check fails

if __name__ == "__main__":
    main()
