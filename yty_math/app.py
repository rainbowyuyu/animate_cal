import input_window
import file_operation
import os


def main():
    if os.path.exists(os.path.join(file_operation.default_file_path, "canvas_cache.txt")):
        os.remove(os.path.join(file_operation.default_file_path, "canvas_cache.txt"))
    input_window.call_input_window()


if __name__ == "__main__":
    main()