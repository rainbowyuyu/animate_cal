from yty_manim.matrix_yty import *
import file_operation as fo
import os


class DetResult(Scene):
    def construct(self):
        result_vgp = VGroup()
        self.camera.background_color = WHITE
        mat_input = fo.read_matrix_from_file(os.path.join(fo.default_file_path, "matrix0_cache.txt"), 'numpy')
        result = int(np.linalg.det(mat_input))
        m = MatrixDet(mat_input).set_color(BLACK)
        result_txt = Text(f"{result}").set_color(BLACK)
        result_vgp.add(m,equal_txt.copy().set_color(BLACK),result_txt)
        result_vgp.arrange(buff=1)
        result_vgp.scale_to_fit_height(6)
        self.add(result_vgp)


class AddResult(Scene):
    def construct(self):
        result_vgp = VGroup()
        self.camera.background_color = WHITE
        mat_input_1 = fo.read_matrix_from_file(os.path.join(fo.default_file_path, "matrix0_cache.txt"), 'numpy')
        mat_input_2 = fo.read_matrix_from_file(os.path.join(fo.default_file_path, "matrix1_cache.txt"), 'numpy')
        m1 = MatrixMath(mat_input_1).set_color(BLACK)
        m2 = MatrixMath(mat_input_2).set_color(BLACK)
        m3 = m1.addition_mat(m2).set_color(BLACK)

        result_vgp.add(m1, add_txt.copy().set_color(BLACK), m2, equal_txt.copy().set_color(BLACK), m3)
        result_vgp.arrange(buff=1)
        result_vgp.scale_to_fit_width(14)
        self.add(result_vgp)


class MulResult(Scene):
    def construct(self):
        result_vgp = VGroup()
        self.camera.background_color = WHITE
        mat_input_1 = fo.read_matrix_from_file(os.path.join(fo.default_file_path, "matrix0_cache.txt"), 'numpy')
        mat_input_2 = fo.read_matrix_from_file(os.path.join(fo.default_file_path, "matrix1_cache.txt"), 'numpy')
        m1 = MatrixMath(mat_input_1).set_color(BLACK)
        m2 = MatrixMath(mat_input_2).set_color(BLACK)
        m3 = m1.dot_multiplication_mat(m2).set_color(BLACK)

        result_vgp.add(m1, times_txt.copy().set_color(BLACK), m2, equal_txt.copy().set_color(BLACK), m3)
        result_vgp.arrange(buff=1)
        result_vgp.scale_to_fit_width(14)
        self.add(result_vgp)

